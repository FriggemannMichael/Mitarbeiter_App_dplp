"""
Employee-Device-Service: anonyme Mitarbeiter-Geraete per HTTP-only Cookie.
"""
import hashlib
import os
import secrets

from django.utils import timezone

from api.models import EmployeeDevice

EMPLOYEE_DEVICE_COOKIE_NAME = os.environ.get('EMPLOYEE_DEVICE_COOKIE_NAME', 'employee_device')
EMPLOYEE_DEVICE_COOKIE_SECURE = os.environ.get('EMPLOYEE_DEVICE_COOKIE_SECURE', 'True').lower() in (
    '1',
    'true',
    'yes',
    'on',
)
EMPLOYEE_DEVICE_COOKIE_SAMESITE = (
    os.environ.get('EMPLOYEE_DEVICE_COOKIE_SAMESITE', 'None') or 'None'
).strip().capitalize()
EMPLOYEE_CSRF_COOKIE_NAME = os.environ.get('EMPLOYEE_CSRF_COOKIE_NAME', 'employee_csrf')
EMPLOYEE_CSRF_HEADER_NAME = os.environ.get('EMPLOYEE_CSRF_HEADER_NAME', 'X-Employee-CSRF')
EMPLOYEE_DEVICE_COOKIE_MAX_AGE = int(
    os.environ.get('EMPLOYEE_DEVICE_COOKIE_MAX_AGE', str(60 * 60 * 24 * 180))
)


def create_employee_device_token() -> str:
    return secrets.token_urlsafe(32)


def create_employee_csrf_token() -> str:
    return secrets.token_urlsafe(24)


def hash_employee_device_token(token: str) -> str:
    return hashlib.sha256((token or '').encode('utf-8')).hexdigest()


def get_device_token_from_request(request) -> str:
    return (request.COOKIES.get(EMPLOYEE_DEVICE_COOKIE_NAME) or '').strip()


def get_employee_csrf_token_from_request(request) -> str:
    return (request.COOKIES.get(EMPLOYEE_CSRF_COOKIE_NAME) or '').strip()


def get_employee_device_from_token(token: str, customer_key: str) -> EmployeeDevice | None:
    token_hash = hash_employee_device_token(token)
    if not token_hash or not customer_key:
        return None

    return (
        EmployeeDevice.objects
        .filter(customer_key=customer_key, token_hash=token_hash, is_active=True)
        .order_by('-updated_at', '-id')
        .first()
    )


def get_employee_device_from_request(request, customer_key: str) -> EmployeeDevice | None:
    token = get_device_token_from_request(request)
    if not token:
        return None
    return get_employee_device_from_token(token, customer_key)


def touch_employee_device(device: EmployeeDevice, display_name: str = '') -> EmployeeDevice:
    update_fields = ['last_seen_at', 'updated_at']
    device.last_seen_at = timezone.now()

    normalized_display_name = (display_name or '').strip()
    if normalized_display_name and normalized_display_name != device.display_name:
        device.display_name = normalized_display_name[:255]
        update_fields.append('display_name')

    device.save(update_fields=update_fields)
    return device


def ensure_employee_device(customer_key: str, display_name: str = '') -> tuple[EmployeeDevice, str, bool]:
    token = create_employee_device_token()
    token_hash = hash_employee_device_token(token)
    device = EmployeeDevice.objects.create(
        customer_key=customer_key,
        token_hash=token_hash,
        display_name=(display_name or '').strip()[:255],
        last_seen_at=timezone.now(),
    )
    return device, token, True


def set_employee_device_cookie(response, token: str):
    response.set_cookie(
        key=EMPLOYEE_DEVICE_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=EMPLOYEE_DEVICE_COOKIE_SAMESITE,
        secure=EMPLOYEE_DEVICE_COOKIE_SECURE,
        max_age=EMPLOYEE_DEVICE_COOKIE_MAX_AGE,
        path='/',
    )


def delete_employee_device_cookie(response):
    response.delete_cookie(
        key=EMPLOYEE_DEVICE_COOKIE_NAME,
        samesite=EMPLOYEE_DEVICE_COOKIE_SAMESITE,
        path='/',
    )


def set_employee_csrf_cookie(response, token: str):
    response.set_cookie(
        key=EMPLOYEE_CSRF_COOKIE_NAME,
        value=token,
        httponly=False,
        samesite=EMPLOYEE_DEVICE_COOKIE_SAMESITE,
        secure=EMPLOYEE_DEVICE_COOKIE_SECURE,
        max_age=EMPLOYEE_DEVICE_COOKIE_MAX_AGE,
        path='/',
    )


def delete_employee_csrf_cookie(response):
    response.delete_cookie(
        key=EMPLOYEE_CSRF_COOKIE_NAME,
        samesite=EMPLOYEE_DEVICE_COOKIE_SAMESITE,
        path='/',
    )


def validate_employee_csrf(request) -> bool:
    cookie_token = get_employee_csrf_token_from_request(request)
    header_token = (request.headers.get(EMPLOYEE_CSRF_HEADER_NAME, '') or '').strip()
    if not cookie_token or not header_token:
        return False
    return secrets.compare_digest(cookie_token, header_token)
