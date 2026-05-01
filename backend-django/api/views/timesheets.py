"""
Timesheet-Endpoints: save-timesheet, get-timesheet, list-timesheets, archive-timesheet
Tenant-scoped ueber customer_key.
"""
import json

from django.utils import timezone

from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from api.helpers import success_response, error_response, unauthorized_response
from api.models import Timesheet
from api.services.employee_device_service import (
    get_employee_device_from_request,
    touch_employee_device,
    validate_employee_csrf,
)
from api.services.tenant_service import get_employee_request_customer_key


def _normalize_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _resolve_week_identity(body: dict, week_data: dict) -> tuple[int | None, int | None, str]:
    week_year = _normalize_int(body.get('year')) or _normalize_int(week_data.get('year'))
    week_number = _normalize_int(body.get('week')) or _normalize_int(week_data.get('week'))
    sheet_id_raw = body.get('sheetId')
    if sheet_id_raw is None:
        sheet_id_raw = week_data.get('sheetId')
    sheet_id = str(sheet_id_raw or '1').strip() or '1'
    return week_year, week_number, sheet_id[:50]


def _serialize_timesheet(timesheet: Timesheet) -> dict:
    return {
        'id': timesheet.id,
        'week_year': timesheet.week_year,
        'week_number': timesheet.week_number,
        'sheet_id': timesheet.sheet_id,
        'updated_at': timesheet.updated_at.isoformat() if timesheet.updated_at else None,
        'weekData': timesheet.week_data,
    }


def _get_active_timesheet_queryset(customer_key, device):
    return (
        Timesheet.objects
        .filter(
            customer_key=customer_key,
            employee_device=device,
            archived_at__isnull=True,
        )
    )


@csrf_exempt
@require_http_methods(['POST'])
def save_timesheet(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    week_data = body.get('weekData')
    if week_data is None:
        return error_response('weekData required', 400)
    if not isinstance(week_data, dict):
        return error_response('weekData must be an object', 400)
    if not validate_employee_csrf(request):
        return unauthorized_response('Invalid CSRF token')

    customer_key = get_employee_request_customer_key(request)
    device = get_employee_device_from_request(request, customer_key)
    if not device:
        return unauthorized_response('Employee device not initialized')

    week_year, week_number, sheet_id = _resolve_week_identity(body, week_data)
    if week_year is None or week_number is None:
        return error_response('weekData.year and weekData.week required', 400)

    display_name = (
        body.get('displayName')
        or week_data.get('employeeName')
        or ''
    )
    touch_employee_device(device, display_name=str(display_name))

    timesheet, _ = Timesheet.objects.update_or_create(
        customer_key=customer_key,
        employee_device=device,
        week_year=week_year,
        week_number=week_number,
        sheet_id=sheet_id,
        defaults={
            'user_id': 1,
            'week_data': week_data,
            'archived_at': None,
            'archived_reason': '',
        }
    )
    return success_response({
        'id': timesheet.id,
        'week_year': week_year,
        'week_number': week_number,
        'sheet_id': sheet_id,
    })


@require_http_methods(['GET'])
def get_timesheet(request):
    customer_key = get_employee_request_customer_key(request)
    device = get_employee_device_from_request(request, customer_key)
    if not device:
        return unauthorized_response('Employee device not initialized')

    touch_employee_device(device)

    week_year = _normalize_int(request.GET.get('year'))
    week_number = _normalize_int(request.GET.get('week'))
    sheet_id = (request.GET.get('sheetId') or '1').strip() or '1'

    queryset = _get_active_timesheet_queryset(customer_key, device).order_by('-updated_at', '-id')

    if week_year is not None and week_number is not None:
        queryset = queryset.filter(
            week_year=week_year,
            week_number=week_number,
            sheet_id=sheet_id[:50],
        )

    ts = queryset.first()
    if not ts:
        return success_response(None)
    return success_response(_serialize_timesheet(ts))


@require_http_methods(['GET'])
def list_timesheets(request):
    customer_key = get_employee_request_customer_key(request)
    device = get_employee_device_from_request(request, customer_key)
    if not device:
        return unauthorized_response('Employee device not initialized')

    touch_employee_device(device)

    week_year = _normalize_int(request.GET.get('year'))
    week_number = _normalize_int(request.GET.get('week'))
    limit = _normalize_int(request.GET.get('limit'))

    queryset = _get_active_timesheet_queryset(customer_key, device).order_by(
        '-week_year',
        '-week_number',
        'sheet_id',
        '-updated_at',
        '-id',
    )

    if week_year is not None:
        queryset = queryset.filter(week_year=week_year)
    if week_number is not None:
        queryset = queryset.filter(week_number=week_number)
    if limit is not None and limit > 0:
        queryset = queryset[:limit]

    return success_response([_serialize_timesheet(ts) for ts in queryset])


@csrf_exempt
@require_http_methods(['POST'])
def archive_timesheet(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    if not validate_employee_csrf(request):
        return unauthorized_response('Invalid CSRF token')

    customer_key = get_employee_request_customer_key(request)
    device = get_employee_device_from_request(request, customer_key)
    if not device:
        return unauthorized_response('Employee device not initialized')

    week_year = _normalize_int(body.get('year'))
    week_number = _normalize_int(body.get('week'))
    sheet_id = str(body.get('sheetId') or '1').strip() or '1'

    if week_year is None or week_number is None:
        return error_response('year and week required', 400)

    touch_employee_device(device)

    timesheet = (
        _get_active_timesheet_queryset(customer_key, device)
        .filter(
            week_year=week_year,
            week_number=week_number,
            sheet_id=sheet_id[:50],
        )
        .first()
    )

    if not timesheet:
        return success_response({
            'archived': False,
            'already_missing': True,
            'week_year': week_year,
            'week_number': week_number,
            'sheet_id': sheet_id[:50],
        })

    timesheet.archived_at = timezone.now()
    timesheet.archived_reason = 'employee_deleted'
    timesheet.save(update_fields=['archived_at', 'archived_reason', 'updated_at'])

    return success_response({
        'archived': True,
        'week_year': week_year,
        'week_number': week_number,
        'sheet_id': sheet_id[:50],
        'archived_at': timesheet.archived_at.isoformat() if timesheet.archived_at else None,
    })
