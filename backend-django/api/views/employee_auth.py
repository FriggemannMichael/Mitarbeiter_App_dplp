"""
Mitarbeiter-Auth-Endpoints:
- Registrierung
- Login
- Logout
- Session-Info
- PIN-Reset
"""
import json

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.helpers import error_response, get_client_ip, success_response, unauthorized_response
from api.services.audit_service import audit
from api.services.employee_auth_service import (
    EmployeeAuthError,
    create_employee_session,
    delete_employee_session_cookie,
    get_employee_profile_from_request,
    invalidate_employee_session,
    login_employee_profile,
    migrate_legacy_device_timesheets_to_profile,
    register_employee_profile,
    reset_employee_pin,
    serialize_employee_profile,
    set_employee_session_cookie,
)
from api.services.employee_device_service import (
    create_employee_csrf_token,
    delete_employee_csrf_cookie,
    set_employee_csrf_cookie,
)
from api.services.tenant_service import get_employee_request_customer_key


def _parse_json_body(request):
    try:
        body = json.loads(request.body) if request.body else {}
    except (json.JSONDecodeError, Exception):
        raise EmployeeAuthError('Invalid JSON', status=400)
    if body is None:
        body = {}
    if not isinstance(body, dict):
        raise EmployeeAuthError('Invalid request format', status=400)
    return body


def _build_auth_response(profile, *, created: bool = False):
    csrf_token = create_employee_csrf_token()
    _, session_token = create_employee_session(profile, profile.customer_key)
    response = success_response({
        'employee': serialize_employee_profile(profile),
        'created': created,
        'csrf_token': csrf_token,
    })
    set_employee_session_cookie(response, session_token)
    set_employee_csrf_cookie(response, csrf_token)
    return response


@csrf_exempt
@require_http_methods(['POST'])
def employee_register(request):
    try:
        body = _parse_json_body(request)
        customer_key = get_employee_request_customer_key(request)
        profile = register_employee_profile(
            customer_key=customer_key,
            first_name=body.get('firstName') or '',
            last_name=body.get('lastName') or '',
            phone_number=body.get('phoneNumber') or '',
            pin=body.get('pin') or '',
        )
        migrated_count = migrate_legacy_device_timesheets_to_profile(
            request,
            customer_key=customer_key,
            profile=profile,
        )
    except EmployeeAuthError as error:
        return error_response(error.message, error.status, code=error.code, data=error.details)

    audit(
        'EMPLOYEE_REGISTER_SUCCESS',
        {
            'employeeProfileId': profile.id,
            'displayName': profile.display_name,
            'migratedLegacyTimesheets': migrated_count,
        },
        get_client_ip(request),
        customer_key=profile.customer_key,
    )
    return _build_auth_response(profile, created=True)


@csrf_exempt
@require_http_methods(['POST'])
def employee_login(request):
    try:
        body = _parse_json_body(request)
        customer_key = get_employee_request_customer_key(request)
        profile = login_employee_profile(
            customer_key=customer_key,
            first_name=body.get('firstName') or '',
            last_name=body.get('lastName') or '',
            pin=body.get('pin') or '',
            phone_number=body.get('phoneNumber') or '',
        )
        migrated_count = migrate_legacy_device_timesheets_to_profile(
            request,
            customer_key=customer_key,
            profile=profile,
        )
    except EmployeeAuthError as error:
        return error_response(error.message, error.status, code=error.code, data=error.details)

    audit(
        'EMPLOYEE_LOGIN_SUCCESS',
        {
            'employeeProfileId': profile.id,
            'displayName': profile.display_name,
            'migratedLegacyTimesheets': migrated_count,
        },
        get_client_ip(request),
        customer_key=profile.customer_key,
    )
    return _build_auth_response(profile, created=False)


@csrf_exempt
@require_http_methods(['POST'])
def employee_reset_pin(request):
    try:
        body = _parse_json_body(request)
        customer_key = get_employee_request_customer_key(request)
        profile = reset_employee_pin(
            customer_key=customer_key,
            first_name=body.get('firstName') or '',
            last_name=body.get('lastName') or '',
            phone_number=body.get('phoneNumber') or '',
            pin=body.get('pin') or '',
        )
        migrated_count = migrate_legacy_device_timesheets_to_profile(
            request,
            customer_key=customer_key,
            profile=profile,
        )
    except EmployeeAuthError as error:
        return error_response(error.message, error.status, code=error.code, data=error.details)

    audit(
        'EMPLOYEE_PIN_RESET',
        {
            'employeeProfileId': profile.id,
            'displayName': profile.display_name,
            'migratedLegacyTimesheets': migrated_count,
        },
        get_client_ip(request),
        customer_key=profile.customer_key,
    )
    return _build_auth_response(profile, created=False)


@csrf_exempt
@require_http_methods(['POST'])
def employee_logout(request):
    customer_key = get_employee_request_customer_key(request)
    profile = get_employee_profile_from_request(request, customer_key)
    if profile:
        audit(
            'EMPLOYEE_LOGOUT',
            {
                'employeeProfileId': profile.id,
                'displayName': profile.display_name,
            },
            get_client_ip(request),
            customer_key=profile.customer_key,
        )

    invalidate_employee_session(request, customer_key)
    response = success_response(None)
    delete_employee_session_cookie(response)
    delete_employee_csrf_cookie(response)
    return response


@require_http_methods(['GET'])
def employee_session(request):
    customer_key = get_employee_request_customer_key(request)
    profile = get_employee_profile_from_request(request, customer_key)
    if not profile:
        return unauthorized_response('Mitarbeiter nicht angemeldet')
    return success_response({
        'employee': serialize_employee_profile(profile),
    })
