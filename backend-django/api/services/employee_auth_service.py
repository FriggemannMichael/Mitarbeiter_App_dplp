"""
Mitarbeiter-Authentifizierung:
- Registrierung ueber Vorname/Nachname/Handynummer + PIN
- Login ueber Vorname/Nachname + PIN
- Session ueber HTTP-only Cookie
"""
import hashlib
import os
import re
import secrets
from dataclasses import dataclass
from datetime import timedelta

import bcrypt
from django.utils import timezone

from api.models import EmployeeProfile, EmployeeSession, Timesheet
from api.services.employee_device_service import get_employee_device_from_request


EMPLOYEE_SESSION_COOKIE_NAME = os.environ.get('EMPLOYEE_SESSION_COOKIE_NAME', 'employee_session')
EMPLOYEE_SESSION_COOKIE_SECURE = os.environ.get('EMPLOYEE_SESSION_COOKIE_SECURE', 'True').lower() in (
    '1',
    'true',
    'yes',
    'on',
)
EMPLOYEE_SESSION_COOKIE_SAMESITE = (
    os.environ.get('EMPLOYEE_SESSION_COOKIE_SAMESITE', 'None') or 'None'
).strip().capitalize()
EMPLOYEE_SESSION_COOKIE_MAX_AGE = int(
    os.environ.get('EMPLOYEE_SESSION_COOKIE_MAX_AGE', str(60 * 60 * 24 * 30))
)


@dataclass
class EmployeeAuthError(Exception):
    message: str
    status: int = 400


def normalize_person_name(value: str | None) -> str:
    return ' '.join((value or '').strip().split())


def normalize_phone_number(value: str | None) -> str:
    digits = re.sub(r'\D+', '', value or '')
    if digits.startswith('00'):
        digits = digits[2:]
    return digits[:50]


def build_display_name(first_name: str, last_name: str) -> str:
    return f'{normalize_person_name(first_name)} {normalize_person_name(last_name)}'.strip()


def validate_pin(pin: str | None) -> str:
    candidate = (pin or '').strip()
    if not re.fullmatch(r'\d{4}', candidate):
        raise EmployeeAuthError('PIN muss genau 4 Ziffern haben')
    return candidate


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_pin(pin: str, pin_hash: str) -> bool:
    if not pin_hash:
        return False
    try:
        normalized_hash = pin_hash.replace('$2y$', '$2b$', 1)
        return bcrypt.checkpw(pin.encode('utf-8'), normalized_hash.encode('utf-8'))
    except Exception:
        return False


def create_employee_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_employee_session_token(token: str) -> str:
    return hashlib.sha256((token or '').encode('utf-8')).hexdigest()


def get_employee_session_token_from_request(request) -> str:
    return (request.COOKIES.get(EMPLOYEE_SESSION_COOKIE_NAME) or '').strip()


def get_employee_session_from_token(token: str, customer_key: str) -> EmployeeSession | None:
    token_hash = hash_employee_session_token(token)
    if not token_hash or not customer_key:
        return None
    now = timezone.now()
    return (
        EmployeeSession.objects
        .select_related('employee_profile')
        .filter(
            customer_key=customer_key,
            token_hash=token_hash,
            expires_at__gt=now,
            employee_profile__is_active=True,
        )
        .order_by('-updated_at', '-id')
        .first()
    )


def touch_employee_session(session: EmployeeSession) -> EmployeeSession:
    session.last_seen_at = timezone.now()
    session.save(update_fields=['last_seen_at', 'updated_at'])
    return session


def get_employee_profile_from_request(request, customer_key: str) -> EmployeeProfile | None:
    token = get_employee_session_token_from_request(request)
    if not token:
        return None
    session = get_employee_session_from_token(token, customer_key)
    if not session:
        return None
    touch_employee_session(session)
    return session.employee_profile


def _find_active_profiles_by_name(customer_key: str, first_name: str, last_name: str):
    first_name_normalized = normalize_person_name(first_name)
    last_name_normalized = normalize_person_name(last_name)
    return list(
        EmployeeProfile.objects.filter(
            customer_key=customer_key,
            is_active=True,
            first_name__iexact=first_name_normalized,
            last_name__iexact=last_name_normalized,
        ).order_by('-updated_at', '-id')
    )


def register_employee_profile(
    *,
    customer_key: str,
    first_name: str,
    last_name: str,
    phone_number: str,
    pin: str,
) -> EmployeeProfile:
    first_name_normalized = normalize_person_name(first_name)
    last_name_normalized = normalize_person_name(last_name)
    phone_number_normalized = normalize_phone_number(phone_number)
    pin_validated = validate_pin(pin)

    if not first_name_normalized or not last_name_normalized:
        raise EmployeeAuthError('Vorname und Nachname sind erforderlich')
    if not phone_number_normalized:
        raise EmployeeAuthError('Handynummer ist erforderlich')

    existing_by_phone = (
        EmployeeProfile.objects
        .filter(customer_key=customer_key, phone_number=phone_number_normalized)
        .order_by('-updated_at', '-id')
        .first()
    )
    if existing_by_phone:
        raise EmployeeAuthError('Für diese Handynummer existiert bereits ein Mitarbeiterkonto')

    existing_by_name = _find_active_profiles_by_name(
        customer_key=customer_key,
        first_name=first_name_normalized,
        last_name=last_name_normalized,
    )
    if existing_by_name:
        raise EmployeeAuthError(
            'Für diesen Namen existiert bereits ein Mitarbeiterkonto. Bitte PIN vergessen verwenden oder Support kontaktieren.'
        )

    return EmployeeProfile.objects.create(
        customer_key=customer_key,
        first_name=first_name_normalized,
        last_name=last_name_normalized,
        display_name=build_display_name(first_name_normalized, last_name_normalized),
        phone_number=phone_number_normalized,
        pin_hash=hash_pin(pin_validated),
    )


def login_employee_profile(
    *,
    customer_key: str,
    first_name: str,
    last_name: str,
    pin: str,
) -> EmployeeProfile:
    pin_validated = validate_pin(pin)
    matches = _find_active_profiles_by_name(
        customer_key=customer_key,
        first_name=first_name,
        last_name=last_name,
    )
    if not matches:
        raise EmployeeAuthError('Mitarbeiterkonto nicht gefunden', status=401)
    if len(matches) > 1:
        raise EmployeeAuthError(
            'Mehrere Mitarbeiter mit gleichem Namen gefunden. Bitte Support kontaktieren.',
            status=409,
        )

    profile = matches[0]
    if not verify_pin(pin_validated, profile.pin_hash):
        raise EmployeeAuthError('Ungültige PIN', status=401)

    EmployeeProfile.objects.filter(pk=profile.id).update(last_login_at=timezone.now())
    profile.last_login_at = timezone.now()
    return profile


def reset_employee_pin(
    *,
    customer_key: str,
    first_name: str,
    last_name: str,
    phone_number: str,
    pin: str,
) -> EmployeeProfile:
    phone_number_normalized = normalize_phone_number(phone_number)
    pin_validated = validate_pin(pin)
    if not phone_number_normalized:
        raise EmployeeAuthError('Handynummer ist erforderlich')

    matches = _find_active_profiles_by_name(
        customer_key=customer_key,
        first_name=first_name,
        last_name=last_name,
    )
    if not matches:
        raise EmployeeAuthError('Mitarbeiterkonto nicht gefunden', status=404)
    if len(matches) > 1:
        exact_matches = [profile for profile in matches if profile.phone_number == phone_number_normalized]
        if len(exact_matches) != 1:
            raise EmployeeAuthError(
                'Mehrere Mitarbeiter mit gleichem Namen gefunden. Bitte Support kontaktieren.',
                status=409,
            )
        profile = exact_matches[0]
    else:
        profile = matches[0]
        if profile.phone_number != phone_number_normalized:
            raise EmployeeAuthError('Handynummer passt nicht zum Mitarbeiterkonto', status=401)

    profile.pin_hash = hash_pin(pin_validated)
    profile.save(update_fields=['pin_hash', 'updated_at'])
    return profile


def create_employee_session(profile: EmployeeProfile, customer_key: str) -> tuple[EmployeeSession, str]:
    token = create_employee_session_token()
    session = EmployeeSession.objects.create(
        customer_key=customer_key,
        employee_profile=profile,
        token_hash=hash_employee_session_token(token),
        expires_at=timezone.now() + timedelta(seconds=EMPLOYEE_SESSION_COOKIE_MAX_AGE),
        last_seen_at=timezone.now(),
    )
    return session, token


def invalidate_employee_session(request, customer_key: str) -> None:
    token = get_employee_session_token_from_request(request)
    if not token:
        return
    session = get_employee_session_from_token(token, customer_key)
    if not session:
        return
    session.delete()


def serialize_employee_profile(profile: EmployeeProfile) -> dict:
    return {
        'id': profile.id,
        'first_name': profile.first_name,
        'last_name': profile.last_name,
        'display_name': profile.display_name or build_display_name(profile.first_name, profile.last_name),
        'phone_number': profile.phone_number,
        'customer_key': profile.customer_key,
        'last_login_at': profile.last_login_at.isoformat() if profile.last_login_at else None,
    }


def _merge_week_data_for_profile(profile: EmployeeProfile, week_data: dict | None) -> dict:
    merged_week_data = dict(week_data or {})
    merged_week_data['employeeName'] = profile.display_name or build_display_name(
        profile.first_name,
        profile.last_name,
    )
    return merged_week_data


def migrate_legacy_device_timesheets_to_profile(
    request,
    *,
    customer_key: str,
    profile: EmployeeProfile,
) -> int:
    legacy_device = get_employee_device_from_request(request, customer_key)
    if not legacy_device:
        return 0

    legacy_timesheets = list(
        Timesheet.objects.filter(
            customer_key=customer_key,
            employee_device=legacy_device,
        ).order_by('created_at', 'id')
    )
    if not legacy_timesheets:
        return 0

    migrated_count = 0
    for legacy_timesheet in legacy_timesheets:
        existing_profile_timesheet = (
            Timesheet.objects.filter(
                customer_key=customer_key,
                employee_profile=profile,
                week_year=legacy_timesheet.week_year,
                week_number=legacy_timesheet.week_number,
                sheet_id=legacy_timesheet.sheet_id,
            )
            .order_by('-updated_at', '-id')
            .first()
        )

        normalized_week_data = _merge_week_data_for_profile(profile, legacy_timesheet.week_data)

        if existing_profile_timesheet:
            if legacy_timesheet.updated_at >= existing_profile_timesheet.updated_at:
                existing_profile_timesheet.week_data = normalized_week_data
                existing_profile_timesheet.archived_at = legacy_timesheet.archived_at
                existing_profile_timesheet.archived_reason = legacy_timesheet.archived_reason
                existing_profile_timesheet.user_id = legacy_timesheet.user_id
                existing_profile_timesheet.save(
                    update_fields=[
                        'week_data',
                        'archived_at',
                        'archived_reason',
                        'user_id',
                        'updated_at',
                    ]
                )
            legacy_timesheet.delete()
            migrated_count += 1
            continue

        legacy_timesheet.employee_profile = profile
        legacy_timesheet.employee_device = None
        legacy_timesheet.week_data = normalized_week_data
        legacy_timesheet.save(
            update_fields=[
                'employee_profile',
                'employee_device',
                'week_data',
                'updated_at',
            ]
        )
        migrated_count += 1

    return migrated_count


def set_employee_session_cookie(response, token: str):
    response.set_cookie(
        key=EMPLOYEE_SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=EMPLOYEE_SESSION_COOKIE_SAMESITE,
        secure=EMPLOYEE_SESSION_COOKIE_SECURE,
        max_age=EMPLOYEE_SESSION_COOKIE_MAX_AGE,
        path='/',
    )


def delete_employee_session_cookie(response):
    response.delete_cookie(
        key=EMPLOYEE_SESSION_COOKIE_NAME,
        samesite=EMPLOYEE_SESSION_COOKIE_SAMESITE,
        path='/',
    )
