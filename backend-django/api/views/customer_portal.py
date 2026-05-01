import csv
import json
from datetime import datetime

from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.helpers import error_response, success_response
from api.models import AuditLog, EmployeeDevice, Timesheet
from api.services.auth_service import (
    ROLE_BACKOFFICE,
    ROLE_BRANCH_MANAGER,
    ROLE_CUSTOMER_ADMIN,
    ROLE_DISPATCHER,
    ROLE_PLATFORM_OWNER,
    ROLE_VIEWER,
    require_roles,
)
from api.services.audit_service import audit
from api.services.config_service import load_config
from api.services.tenant_service import get_request_customer_key


PORTAL_READ_ROLES = (
    ROLE_CUSTOMER_ADMIN,
    ROLE_PLATFORM_OWNER,
    ROLE_BACKOFFICE,
    ROLE_DISPATCHER,
    ROLE_BRANCH_MANAGER,
    ROLE_VIEWER,
)

PORTAL_APPROVAL_ROLES = (
    ROLE_CUSTOMER_ADMIN,
    ROLE_PLATFORM_OWNER,
    ROLE_BACKOFFICE,
)

REVIEW_STATUS_OPEN = "open"
REVIEW_STATUS_SUBMITTED = "submitted"
REVIEW_STATUS_REVIEWED = "reviewed"
REVIEW_STATUS_APPROVED = "approved"
REVIEW_STATUS_REJECTED = "rejected"

VALID_REVIEW_STATUSES = {
    REVIEW_STATUS_REVIEWED,
    REVIEW_STATUS_APPROVED,
    REVIEW_STATUS_REJECTED,
}

PORTAL_AUDIT_ACTIONS = {
    "PORTAL_TIMESHEET_REVIEWED",
    "PORTAL_TIMESHEET_APPROVED",
    "PORTAL_TIMESHEET_REJECTED",
    "PORTAL_TIMESHEET_COMMENTED",
}


def _current_week_identity() -> tuple[int, int]:
    now = timezone.localtime()
    iso_year, iso_week, _ = now.isocalendar()
    return iso_year, iso_week


def _parse_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _extract_employee_name(timesheet: Timesheet) -> str:
    week_data = timesheet.week_data or {}
    employee_name = (week_data.get("employeeName") or "").strip()
    if employee_name:
        return employee_name
    if timesheet.employee_device and timesheet.employee_device.display_name:
        return timesheet.employee_device.display_name.strip()
    return f"Mitarbeiter #{timesheet.employee_device_id or timesheet.id}"


def _extract_review_meta(week_data: dict) -> dict:
    review = week_data.get("portalReview") or {}
    if not isinstance(review, dict):
        review = {}
    return review


def _append_review_history(
    week_data: dict,
    *,
    action: str,
    actor: str,
    actor_role: str,
    comment: str = "",
    status: str = "",
) -> list[dict]:
    review = _extract_review_meta(week_data)
    history = review.get("history") or []
    if not isinstance(history, list):
        history = []

    entry = {
        "timestamp": timezone.now().isoformat(),
        "action": action,
        "status": status,
        "actor": actor,
        "actorRole": actor_role,
        "comment": comment,
    }
    history.append(entry)
    review["history"] = history[-100:]
    week_data["portalReview"] = review
    return review["history"]


def _derive_review_status(week_data: dict) -> str:
    review = _extract_review_meta(week_data)
    review_status = (review.get("status") or "").strip().lower()
    if review_status in {
        REVIEW_STATUS_REVIEWED,
        REVIEW_STATUS_APPROVED,
        REVIEW_STATUS_REJECTED,
    }:
        return review_status

    workflow_status = (week_data.get("status") or "").strip().upper()
    if workflow_status == "PENDING_REVIEW":
        return REVIEW_STATUS_SUBMITTED
    return REVIEW_STATUS_OPEN


def _sum_week_hours(days: list[dict]) -> float:
    total = 0.0
    for day in days or []:
        try:
            total += float(day.get("decimal") or 0)
        except (TypeError, ValueError):
            continue
    return round(total, 2)


def _count_absence_days(days: list[dict]) -> int:
    count = 0
    for day in days or []:
        absence = day.get("absence")
        if absence and absence != "holiday":
            count += 1
    return count


def _has_signature(week_data: dict) -> bool:
    return bool((week_data.get("employeeSignature") or "").strip())


def _serialize_timesheet_portal(timesheet: Timesheet) -> dict:
    week_data = timesheet.week_data or {}
    days = week_data.get("days") or []
    review = _extract_review_meta(week_data)

    return {
        "id": timesheet.id,
        "employee_name": _extract_employee_name(timesheet),
        "week_year": timesheet.week_year,
        "week_number": timesheet.week_number,
        "sheet_id": timesheet.sheet_id,
        "customer": (week_data.get("customer") or "").strip(),
        "week_data": week_data,
        "status": _derive_review_status(week_data),
        "workflow_status": week_data.get("status") or "OPEN",
        "hours_total": _sum_week_hours(days),
        "absence_days": _count_absence_days(days),
        "has_signature": _has_signature(week_data),
        "reviewed_by": review.get("reviewedBy"),
        "reviewed_at": review.get("reviewedAt"),
        "rejection_reason": review.get("rejectionReason"),
        "customer_comment": review.get("customerComment") or "",
        "history": review.get("history") or [],
        "updated_at": timesheet.updated_at.isoformat() if timesheet.updated_at else None,
    }


def _serialize_audit_entry(entry: AuditLog) -> dict:
    details = entry.details or {}
    return {
        "id": entry.id,
        "action": entry.action,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "timesheet_id": details.get("timesheetId"),
        "sheet_id": details.get("sheetId"),
        "employee_name": details.get("employeeName"),
        "status": details.get("status"),
        "comment": details.get("comment") or details.get("rejectionReason") or "",
        "actor": details.get("actor"),
        "actor_role": details.get("actorRole"),
    }


def _get_timesheet_queryset(customer_key: str):
    return (
        Timesheet.objects
        .filter(customer_key=customer_key, archived_at__isnull=True)
        .select_related("employee_device")
        .order_by("-week_year", "-week_number", "sheet_id", "-updated_at", "-id")
    )


def _get_known_employee_names(customer_key: str, timesheets: list[Timesheet]) -> list[str]:
    names: set[str] = set()
    for device_name in EmployeeDevice.objects.filter(
        customer_key=customer_key,
        is_active=True,
    ).exclude(display_name="").values_list("display_name", flat=True):
        value = (device_name or "").strip()
        if value:
            names.add(value)

    for timesheet in timesheets:
        value = _extract_employee_name(timesheet).strip()
        if value:
            names.add(value)

    return sorted(names, key=lambda value: value.lower())


def _build_missing_employees(employee_names: list[str], timesheets: list[Timesheet]) -> list[str]:
    current_year, current_week = _current_week_identity()
    present_names = {
        _extract_employee_name(timesheet)
        for timesheet in timesheets
        if timesheet.week_year == current_year and timesheet.week_number == current_week
    }
    return [name for name in employee_names if name not in present_names]


@require_roles(*PORTAL_READ_ROLES)
@require_http_methods(["GET"])
def portal_summary(request):
    customer_key = get_request_customer_key(request)
    queryset = list(_get_timesheet_queryset(customer_key))
    current_year, current_week = _current_week_identity()

    current_week_timesheets = [
        timesheet
        for timesheet in queryset
        if timesheet.week_year == current_year and timesheet.week_number == current_week
    ]
    current_week_hours = sum(
        _sum_week_hours((timesheet.week_data or {}).get("days") or [])
        for timesheet in current_week_timesheets
    )
    current_absences = sum(
        _count_absence_days((timesheet.week_data or {}).get("days") or [])
        for timesheet in current_week_timesheets
    )
    submitted_count = sum(
        1 for timesheet in queryset if _derive_review_status(timesheet.week_data or {}) == REVIEW_STATUS_SUBMITTED
    )
    known_employee_names = _get_known_employee_names(customer_key, queryset)
    missing_employees = _build_missing_employees(known_employee_names, queryset)

    return success_response({
        "current_week": {"year": current_year, "week": current_week},
        "metrics": {
            "current_week_hours": round(current_week_hours, 2),
            "submitted_timesheets": submitted_count,
            "missing_timesheets": len(missing_employees),
            "current_absence_days": current_absences,
        },
        "missing_employees": missing_employees,
    })


@require_roles(*PORTAL_READ_ROLES)
@require_http_methods(["GET"])
def portal_employees(request):
    customer_key = get_request_customer_key(request)
    queryset = list(_get_timesheet_queryset(customer_key))
    current_year, current_week = _current_week_identity()

    by_employee: dict[str, dict] = {}
    for employee_name in _get_known_employee_names(customer_key, queryset):
        by_employee[employee_name] = {
            "employee_name": employee_name,
            "timesheet_count": 0,
            "current_week_hours": 0.0,
            "current_absence_days": 0,
            "latest_status": REVIEW_STATUS_OPEN,
            "last_updated_at": None,
            "has_current_week_timesheet": False,
        }

    for timesheet in queryset:
        employee_name = _extract_employee_name(timesheet)
        days = (timesheet.week_data or {}).get("days") or []
        item = by_employee.setdefault(employee_name, {
            "employee_name": employee_name,
            "timesheet_count": 0,
            "current_week_hours": 0.0,
            "current_absence_days": 0,
            "latest_status": REVIEW_STATUS_OPEN,
            "last_updated_at": None,
            "has_current_week_timesheet": False,
        })
        item["timesheet_count"] += 1
        status = _derive_review_status(timesheet.week_data or {})
        updated_at = timesheet.updated_at.isoformat() if timesheet.updated_at else None
        if not item["last_updated_at"] or (updated_at and updated_at > item["last_updated_at"]):
            item["latest_status"] = status
            item["last_updated_at"] = updated_at

        if timesheet.week_year == current_year and timesheet.week_number == current_week:
            item["has_current_week_timesheet"] = True
            item["current_week_hours"] += _sum_week_hours(days)
            item["current_absence_days"] += _count_absence_days(days)

    employees = list(by_employee.values())
    employees.sort(key=lambda item: item["employee_name"].lower())
    for item in employees:
        item["current_week_hours"] = round(item["current_week_hours"], 2)
    return success_response(employees)


@require_roles(*PORTAL_READ_ROLES)
@require_http_methods(["GET"])
def portal_timesheets(request):
    customer_key = get_request_customer_key(request)
    queryset = list(_get_timesheet_queryset(customer_key))

    employee_name_filter = (request.GET.get("employeeName") or "").strip().lower()
    week_year = _parse_int(request.GET.get("year"))
    week_number = _parse_int(request.GET.get("week"))
    month = _parse_int(request.GET.get("month"))
    status_filter = (request.GET.get("status") or "").strip().lower()

    items = []
    for timesheet in queryset:
        serialized = _serialize_timesheet_portal(timesheet)
        if employee_name_filter and employee_name_filter not in serialized["employee_name"].lower():
            continue
        if week_year is not None and serialized["week_year"] != week_year:
            continue
        if week_number is not None and serialized["week_number"] != week_number:
            continue
        if status_filter and serialized["status"] != status_filter:
            continue
        if month is not None:
            week_data = timesheet.week_data or {}
            days = week_data.get("days") or []
            month_matches = False
            for day in days:
                date_value = day.get("date")
                if not isinstance(date_value, str):
                    continue
                try:
                    month_value = datetime.fromisoformat(date_value).month
                except ValueError:
                    continue
                if month_value == month:
                    month_matches = True
                    break
            if not month_matches:
                continue
        items.append(serialized)

    return success_response(items)


@require_roles(*PORTAL_READ_ROLES)
@require_http_methods(["GET"])
def portal_absences(request):
    customer_key = get_request_customer_key(request)
    queryset = list(_get_timesheet_queryset(customer_key))

    employee_name_filter = (request.GET.get("employeeName") or "").strip().lower()
    items: list[dict] = []

    for timesheet in queryset:
        employee_name = _extract_employee_name(timesheet)
        if employee_name_filter and employee_name_filter not in employee_name.lower():
            continue

        week_data = timesheet.week_data or {}
        for day in week_data.get("days") or []:
            absence = day.get("absence")
            if not absence or absence == "holiday":
                continue
            items.append({
                "timesheet_id": timesheet.id,
                "employee_name": employee_name,
                "date": day.get("date"),
                "absence": absence,
                "absence_note": day.get("absenceNote") or "",
                "week_year": timesheet.week_year,
                "week_number": timesheet.week_number,
                "sheet_id": timesheet.sheet_id,
                "customer": (week_data.get("customer") or "").strip(),
            })

    items.sort(key=lambda item: (item["date"] or "", item["employee_name"].lower()), reverse=True)
    return success_response(items)


@require_roles(*PORTAL_READ_ROLES)
@require_http_methods(["GET"])
def portal_audit_log(request):
    customer_key = get_request_customer_key(request)
    timesheet_id = _parse_int(request.GET.get("timesheetId"))
    queryset = AuditLog.objects.filter(
        customer_key=customer_key,
        action__in=PORTAL_AUDIT_ACTIONS,
    ).order_by("-created_at", "-id")

    if timesheet_id is not None:
        queryset = queryset.filter(details__timesheetId=timesheet_id)

    limit = _parse_int(request.GET.get("limit")) or 100
    if limit > 0:
        queryset = queryset[: min(limit, 250)]

    return success_response([_serialize_audit_entry(entry) for entry in queryset])


@csrf_exempt
@require_roles(*PORTAL_APPROVAL_ROLES)
@require_http_methods(["POST"])
def portal_update_timesheet_status(request, timesheet_id: int):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response("Invalid JSON", 400)

    next_status = (body.get("status") or "").strip().lower()
    rejection_reason = (body.get("rejectionReason") or "").strip()
    customer_comment = (body.get("comment") or "").strip()
    if next_status not in VALID_REVIEW_STATUSES:
        return error_response("Invalid status", 400)

    customer_key = get_request_customer_key(request, body=body)
    timesheet = (
        Timesheet.objects
        .filter(customer_key=customer_key, id=timesheet_id, archived_at__isnull=True)
        .select_related("employee_device")
        .first()
    )
    if not timesheet:
        return error_response("Timesheet not found", 404)

    config = load_config(customer_key) or {}
    requires_signature = bool((config.get("work") or {}).get("enable_signature_requirement", True))
    week_data = dict(timesheet.week_data or {})
    if next_status == REVIEW_STATUS_APPROVED and requires_signature and not _has_signature(week_data):
        return error_response("Approval requires employee signature", 400)
    if next_status == REVIEW_STATUS_REJECTED and not rejection_reason:
        return error_response("rejectionReason required", 400)

    actor = getattr(request, "admin_user", {}) or {}
    actor_name = actor.get("username") or actor.get("sub") or "portal-user"
    actor_role = actor.get("role") or ""
    portal_review = _extract_review_meta(week_data)
    portal_review.update({
        "status": next_status,
        "reviewedAt": timezone.now().isoformat(),
        "reviewedBy": actor_name,
        "rejectionReason": rejection_reason if next_status == REVIEW_STATUS_REJECTED else "",
        "customerComment": customer_comment or portal_review.get("customerComment") or "",
    })
    week_data["portalReview"] = portal_review
    _append_review_history(
        week_data,
        action=f"status:{next_status}",
        actor=actor_name,
        actor_role=actor_role,
        comment=rejection_reason or customer_comment,
        status=next_status,
    )

    if next_status == REVIEW_STATUS_REJECTED:
        week_data["status"] = "OPEN"
        week_data["locked"] = False

    timesheet.week_data = week_data
    timesheet.save(update_fields=["week_data", "updated_at"])
    audit(
        f"PORTAL_TIMESHEET_{next_status.upper()}",
        {
            "timesheetId": timesheet.id,
            "sheetId": timesheet.sheet_id,
            "employeeName": _extract_employee_name(timesheet),
            "status": next_status,
            "comment": customer_comment,
            "rejectionReason": rejection_reason,
            "actor": actor_name,
            "actorRole": actor_role,
        },
        request.META.get("REMOTE_ADDR"),
        customer_key=customer_key,
    )
    return success_response(_serialize_timesheet_portal(timesheet))


@csrf_exempt
@require_roles(*PORTAL_APPROVAL_ROLES)
@require_http_methods(["POST"])
def portal_add_timesheet_comment(request, timesheet_id: int):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response("Invalid JSON", 400)

    comment = (body.get("comment") or "").strip()
    if not comment:
        return error_response("comment required", 400)

    customer_key = get_request_customer_key(request, body=body)
    timesheet = (
        Timesheet.objects
        .filter(customer_key=customer_key, id=timesheet_id, archived_at__isnull=True)
        .select_related("employee_device")
        .first()
    )
    if not timesheet:
        return error_response("Timesheet not found", 404)

    actor = getattr(request, "admin_user", {}) or {}
    actor_name = actor.get("username") or actor.get("sub") or "portal-user"
    actor_role = actor.get("role") or ""

    week_data = dict(timesheet.week_data or {})
    review = _extract_review_meta(week_data)
    review["customerComment"] = comment
    week_data["portalReview"] = review
    _append_review_history(
        week_data,
        action="comment",
        actor=actor_name,
        actor_role=actor_role,
        comment=comment,
        status=_derive_review_status(week_data),
    )

    timesheet.week_data = week_data
    timesheet.save(update_fields=["week_data", "updated_at"])
    audit(
        "PORTAL_TIMESHEET_COMMENTED",
        {
            "timesheetId": timesheet.id,
            "sheetId": timesheet.sheet_id,
            "employeeName": _extract_employee_name(timesheet),
            "status": _derive_review_status(week_data),
            "comment": comment,
            "actor": actor_name,
            "actorRole": actor_role,
        },
        request.META.get("REMOTE_ADDR"),
        customer_key=customer_key,
    )
    return success_response(_serialize_timesheet_portal(timesheet))


@require_roles(*PORTAL_READ_ROLES)
@require_http_methods(["GET"])
def portal_timesheets_csv(request):
    customer_key = get_request_customer_key(request)
    queryset = list(_get_timesheet_queryset(customer_key))

    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="kundenportal-stundenzettel.csv"'
    response.write("\ufeff")

    writer = csv.writer(response, delimiter=";")
    writer.writerow([
        "Mitarbeiter",
        "Jahr",
        "Woche",
        "Zettel",
        "Kunde",
        "Status",
        "Stunden",
        "Abwesenheitstage",
        "Unterschrift",
        "Aktualisiert",
    ])

    for timesheet in queryset:
        item = _serialize_timesheet_portal(timesheet)
        writer.writerow([
            item["employee_name"],
            item["week_year"],
            item["week_number"],
            item["sheet_id"],
            item["customer"],
            item["status"],
            item["hours_total"],
            item["absence_days"],
            "ja" if item["has_signature"] else "nein",
            item["updated_at"] or "",
        ])

    return response
