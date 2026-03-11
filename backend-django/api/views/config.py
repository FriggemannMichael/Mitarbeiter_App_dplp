"""
Config-Endpoints: get-app-config, get-admin-config, save-admin-config, change-password.
Tenant-scoped ueber customer_key.
"""
import os
import json
import bcrypt

from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from api.helpers import success_response, error_response, unauthorized_response, get_client_ip
from api.services.auth_service import (
    require_roles,
    ROLE_DISPATCHER,
    ROLE_BRANCH_MANAGER,
    ROLE_BACKOFFICE,
    ROLE_CUSTOMER_ADMIN,
    ROLE_PLATFORM_OWNER,
)
from api.models import Account
from api.services.config_service import load_config, save_config, get_app_config
from api.services.audit_service import audit
from api.services.tenant_service import get_request_customer_key


@require_http_methods(['GET'])
def app_config(request):
    customer_key = get_request_customer_key(request)
    result = get_app_config(customer_key=customer_key)
    return success_response(result)


@require_roles(
    ROLE_DISPATCHER,
    ROLE_BRANCH_MANAGER,
    ROLE_BACKOFFICE,
    ROLE_CUSTOMER_ADMIN,
    ROLE_PLATFORM_OWNER,
)
@require_http_methods(['GET'])
def admin_config(request):
    customer_key = get_request_customer_key(request)
    config = load_config(customer_key=customer_key)
    return success_response(config)


@csrf_exempt
@require_roles(ROLE_CUSTOMER_ADMIN, ROLE_PLATFORM_OWNER)
@require_http_methods(['PUT'])
def save_admin_config(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    if not isinstance(body, dict):
        return error_response('Invalid config format', 400)

    customer_key = get_request_customer_key(request, body=body)
    success = save_config(body, customer_key=customer_key)
    if success:
        audit('ADMIN_CONFIG_SAVED', {'keys': list(body.keys())}, get_client_ip(request), customer_key=customer_key)
        return success_response(None)
    return error_response('Failed to save config', 500)


@csrf_exempt
@require_roles(ROLE_CUSTOMER_ADMIN, ROLE_PLATFORM_OWNER)
@require_http_methods(['POST'])
def change_password(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    current_password = body.get('current_password', '')
    new_password = body.get('new_password', '')

    if not current_password or not new_password:
        return error_response('current_password and new_password required', 400)
    if len(new_password) < 8:
        return error_response('New password must be at least 8 characters', 400)

    customer_key = get_request_customer_key(request, body=body)
    admin_user = getattr(request, 'admin_user', {}) or {}
    account_id = admin_user.get('account_id')

    if account_id:
        account = Account.objects.filter(id=account_id, customer_key=customer_key).first()
        if not account:
            return unauthorized_response('Account not found')

        hash_normalized = account.password_hash.replace('$2y$', '$2b$', 1)
        try:
            valid = bcrypt.checkpw(current_password.encode('utf-8'), hash_normalized.encode('utf-8'))
        except Exception:
            valid = False

        if not valid:
            audit('PASSWORD_CHANGE_FAILED', {'reason': 'invalid_current_password', 'account_id': account_id}, get_client_ip(request), customer_key=customer_key)
            return unauthorized_response('Aktuelles Passwort ist falsch')

        account.password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        account.save(update_fields=['password_hash', 'updated_at'])
        audit('PASSWORD_CHANGED', {'account_id': account_id}, get_client_ip(request), customer_key=customer_key)
        return success_response(None)

    # Legacy-Fallback fuer Bestandskunden ohne Account-Modell.
    config = load_config(customer_key=customer_key) or {}
    stored_hash = config.get('admin', {}).get('password_hash') or os.environ.get('ADMIN_PASSWORD_HASH', '')
    if not stored_hash:
        return error_response('No admin config found', 400)

    hash_normalized = stored_hash.replace('$2y$', '$2b$', 1)
    try:
        valid = bcrypt.checkpw(current_password.encode('utf-8'), hash_normalized.encode('utf-8'))
    except Exception:
        valid = False

    if not valid:
        audit('PASSWORD_CHANGE_FAILED', {'reason': 'invalid_current_password', 'legacy': True}, get_client_ip(request), customer_key=customer_key)
        return unauthorized_response('Aktuelles Passwort ist falsch')

    new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    config.setdefault('admin', {})
    config['admin']['password_hash'] = new_hash
    save_config({'admin': config['admin']}, customer_key=customer_key)
    audit('PASSWORD_CHANGED', {'legacy': True}, get_client_ip(request), customer_key=customer_key)
    return success_response(None)
