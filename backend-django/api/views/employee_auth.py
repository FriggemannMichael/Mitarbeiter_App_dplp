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
    enforce_employee_auth_rate_limit,
    get_employee_profile_from_request,
    invalidate_employee_session,
    login_employee_profile,
    migrate_legacy_device_timesheets_to_profile,
    normalize_person_name,
    normalize_phone_number,
    record_employee_auth_failure,
    register_employee_profile,
    reset_employee_auth_failures,
    reset_employee_pin,
    serialize_employee_profile,
    set_employee_session_cookie,
    update_employee_phone,
)
from api.services.employee_device_service import (
    create_employee_csrf_token,
    delete_employee_device_cookie,
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
        'session_token': session_token,
    })
    set_employee_session_cookie(response, session_token)
    set_employee_csrf_cookie(response, csrf_token)
    delete_employee_device_cookie(response)
    return response


def _build_rate_limit_identity(customer_key: str, ip_address: str, *parts: str) -> str:
    normalized_parts = [normalize_person_name(part) for part in parts[:-1]]
    if parts:
        normalized_parts.append(normalize_phone_number(parts[-1]))
    identity_parts = [customer_key, ip_address, *normalized_parts]
    return '|'.join(part for part in identity_parts if part)


@csrf_exempt
@require_http_methods(['POST'])
def employee_register(request):
    body = None
    customer_key = get_employee_request_customer_key(request)
    client_ip = get_client_ip(request)
    try:
        body = _parse_json_body(request)
        rate_limit_identity = _build_rate_limit_identity(
            customer_key,
            client_ip,
            body.get('firstName') or '',
            body.get('lastName') or '',
            body.get('phoneNumber') or '',
        )
        enforce_employee_auth_rate_limit('register', rate_limit_identity)
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
        if body is not None and error.code != 'RATE_LIMITED':
            record_employee_auth_failure('register', rate_limit_identity)
        return error_response(error.message, error.status, code=error.code, data=error.details)
    reset_employee_auth_failures('register', rate_limit_identity)

    audit(
        'EMPLOYEE_REGISTER_SUCCESS',
        {
            'employeeProfileId': profile.id,
            'displayName': profile.display_name,
            'migratedLegacyTimesheets': migrated_count,
        },
        client_ip,
        customer_key=profile.customer_key,
    )
    return _build_auth_response(profile, created=True)


@csrf_exempt
@require_http_methods(['POST'])
def employee_login(request):
    body = None
    customer_key = get_employee_request_customer_key(request)
    client_ip = get_client_ip(request)
    try:
        body = _parse_json_body(request)
        rate_limit_identity = _build_rate_limit_identity(
            customer_key,
            client_ip,
            body.get('firstName') or '',
            body.get('lastName') or '',
            body.get('phoneNumber') or '',
        )
        enforce_employee_auth_rate_limit('login', rate_limit_identity)
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
        if body is not None and error.code != 'RATE_LIMITED':
            record_employee_auth_failure('login', rate_limit_identity)
        return error_response(error.message, error.status, code=error.code, data=error.details)
    reset_employee_auth_failures('login', rate_limit_identity)

    audit(
        'EMPLOYEE_LOGIN_SUCCESS',
        {
            'employeeProfileId': profile.id,
            'displayName': profile.display_name,
            'migratedLegacyTimesheets': migrated_count,
        },
        client_ip,
        customer_key=profile.customer_key,
    )
    return _build_auth_response(profile, created=False)


@csrf_exempt
@require_http_methods(['POST'])
def employee_reset_pin(request):
    body = None
    customer_key = get_employee_request_customer_key(request)
    client_ip = get_client_ip(request)
    try:
        body = _parse_json_body(request)
        rate_limit_identity = _build_rate_limit_identity(
            customer_key,
            client_ip,
            body.get('firstName') or '',
            body.get('lastName') or '',
            body.get('phoneNumber') or '',
        )
        enforce_employee_auth_rate_limit('reset-pin', rate_limit_identity)
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
        if body is not None and error.code != 'RATE_LIMITED':
            record_employee_auth_failure('reset-pin', rate_limit_identity)
        return error_response(error.message, error.status, code=error.code, data=error.details)
    reset_employee_auth_failures('reset-pin', rate_limit_identity)

    audit(
        'EMPLOYEE_PIN_RESET',
        {
            'employeeProfileId': profile.id,
            'displayName': profile.display_name,
            'migratedLegacyTimesheets': migrated_count,
        },
        client_ip,
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
    delete_employee_device_cookie(response)
    delete_employee_csrf_cookie(response)
    return response


@csrf_exempt
@require_http_methods(['POST'])
def employee_update_phone(request):
    body = None
    try:
        body = _parse_json_body(request)
        customer_key = get_employee_request_customer_key(request)
        client_ip = get_client_ip(request)
        profile = get_employee_profile_from_request(request, customer_key)
        if not profile:
            return unauthorized_response('Mitarbeiter nicht angemeldet')
        rate_limit_identity = _build_rate_limit_identity(
            customer_key,
            client_ip,
            profile.first_name,
            profile.last_name,
            profile.phone_number,
        )
        enforce_employee_auth_rate_limit('update-phone', rate_limit_identity)

        profile = update_employee_phone(
            profile=profile,
            new_phone_number=body.get('phoneNumber') or '',
            pin=body.get('pin') or '',
        )
    except EmployeeAuthError as error:
        if body is not None and error.code != 'RATE_LIMITED':
            record_employee_auth_failure('update-phone', rate_limit_identity)
        return error_response(error.message, error.status, code=error.code, data=error.details)
    reset_employee_auth_failures('update-phone', rate_limit_identity)

    audit(
        'EMPLOYEE_PHONE_UPDATED',
        {
            'employeeProfileId': profile.id,
            'displayName': profile.display_name,
        },
        get_client_ip(request),
        customer_key=profile.customer_key,
    )
    return success_response({
        'employee': serialize_employee_profile(profile),
    })


@require_http_methods(['GET'])
def employee_session(request):
    customer_key = get_employee_request_customer_key(request)
    profile, token = get_employee_profile_from_request(request, customer_key, return_token=True)
    response = success_response({
        'employee': serialize_employee_profile(profile) if profile else None,
    })
    if profile and token:
        set_employee_session_cookie(response, token)
    return response
