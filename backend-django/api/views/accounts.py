"""
Account-Endpoints: tenant-scoped Rollenverwaltung.
"""
import json

import bcrypt
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.helpers import success_response, error_response, unauthorized_response, get_client_ip
from api.models import Account
from api.services.audit_service import audit
from api.services.auth_service import (
    require_roles,
    ROLE_CUSTOMER_ADMIN,
    ROLE_PLATFORM_OWNER,
    VALID_ROLES,
    normalize_username,
)
from api.services.tenant_service import get_request_customer_key


def _serialize_account(account: Account) -> dict:
    return {
        'id': account.id,
        'username': account.username,
        'email': account.email,
        'role': account.role,
        'is_active': account.is_active,
        'last_login_at': account.last_login_at.isoformat() if account.last_login_at else None,
        'updated_at': account.updated_at.isoformat() if account.updated_at else None,
    }


def _get_actor_role(request) -> str:
    payload = getattr(request, 'admin_user', {}) or {}
    return (payload.get('role') or '').strip().lower()


def _can_assign_role(request, role: str) -> bool:
    role_normalized = (role or '').strip().lower()
    actor_role = _get_actor_role(request)
    if role_normalized == ROLE_PLATFORM_OWNER and actor_role != ROLE_PLATFORM_OWNER:
        return False
    return True


@require_roles(ROLE_CUSTOMER_ADMIN, ROLE_PLATFORM_OWNER)
@require_http_methods(['GET'])
def list_accounts(request):
    customer_key = get_request_customer_key(request)
    accounts = (
        Account.objects
        .filter(customer_key=customer_key)
        .order_by('username', 'id')
    )
    return success_response([_serialize_account(account) for account in accounts])


@csrf_exempt
@require_roles(ROLE_CUSTOMER_ADMIN, ROLE_PLATFORM_OWNER)
@require_http_methods(['POST'])
def create_account(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    username = normalize_username(body.get('username'))
    password = body.get('password', '')
    role = (body.get('role') or ROLE_CUSTOMER_ADMIN).strip().lower()
    email = (body.get('email') or '').strip()
    is_active = bool(body.get('is_active', True))

    if not username or not password:
        return error_response('username and password required', 400)
    if len(password) < 8:
        return error_response('Password must be at least 8 characters', 400)
    if role not in VALID_ROLES:
        return error_response('Invalid role', 400)
    if not _can_assign_role(request, role):
        return unauthorized_response('Only platform_owner can assign platform_owner role')

    customer_key = get_request_customer_key(request, body=body)

    exists = Account.objects.filter(customer_key=customer_key, username__iexact=username).exists()
    if exists:
        return error_response('Username already exists for this tenant', 409)

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    account = Account.objects.create(
        customer_key=customer_key,
        username=username,
        email=email,
        password_hash=password_hash,
        role=role,
        is_active=is_active,
    )
    audit(
        'ACCOUNT_CREATED',
        {'account_id': account.id, 'username': account.username, 'role': account.role},
        get_client_ip(request),
        customer_key=customer_key,
    )
    return success_response(_serialize_account(account), status=201)


@csrf_exempt
@require_roles(ROLE_CUSTOMER_ADMIN, ROLE_PLATFORM_OWNER)
@require_http_methods(['PUT'])
def update_account(request, account_id: int):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    customer_key = get_request_customer_key(request, body=body)
    account = (
        Account.objects
        .filter(customer_key=customer_key, id=account_id)
        .first()
    )
    if not account:
        return error_response('Account not found', 404)

    role = body.get('role')
    if role is not None:
        role = str(role).strip().lower()
        if role not in VALID_ROLES:
            return error_response('Invalid role', 400)
        if not _can_assign_role(request, role):
            return unauthorized_response('Only platform_owner can assign platform_owner role')
        account.role = role

    if 'email' in body:
        account.email = str(body.get('email') or '').strip()

    if 'is_active' in body:
        account.is_active = bool(body.get('is_active'))

    password = body.get('password')
    if password is not None:
        if not isinstance(password, str) or len(password) < 8:
            return error_response('Password must be at least 8 characters', 400)
        account.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    account.save()
    audit(
        'ACCOUNT_UPDATED',
        {'account_id': account.id, 'username': account.username, 'role': account.role},
        get_client_ip(request),
        customer_key=customer_key,
    )
    return success_response(_serialize_account(account))
