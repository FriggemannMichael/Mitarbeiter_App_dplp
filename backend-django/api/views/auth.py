"""
Auth-Endpoints: login, logout, me
Identisches Verhalten wie PHP index.php handleAuthLogin/Logout/Me
"""
import os
import json
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from api.helpers import success_response, error_response, unauthorized_response, get_client_ip
from api.services.auth_service import (
    verify_admin_password, create_jwt_token, get_token_from_request,
    verify_jwt_token, set_jwt_cookie, delete_jwt_cookie, ADMIN_USERNAME,
    get_auth_context, verify_account_password, normalize_username
)
from api.services.audit_service import audit
from api.services.tenant_service import get_request_customer_key
from api.models import Account

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', os.environ.get('RECIPIENT_EMAIL', ''))


@csrf_exempt
@require_http_methods(['POST'])
def login(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    username = body.get('username', '').strip()
    password = body.get('password', '')

    if not username or not password:
        return error_response('Username and password required', 400)

    requested_customer_key = get_request_customer_key(request, body=body)
    normalized_username = normalize_username(username)
    account = verify_account_password(
        username=normalized_username,
        password=password,
        customer_key=requested_customer_key,
    )

    if account:
        auth_ctx = get_auth_context(customer_key=requested_customer_key)
        token = create_jwt_token(
            account.username,
            role=account.role or auth_ctx.get('role'),
            customer_key=account.customer_key or auth_ctx.get('customer_key'),
            account_id=account.id,
        )
        response = success_response({
            'id': account.id,
            'account_id': account.id,
            'username': account.username,
            'email': account.email or ADMIN_EMAIL,
            'role': account.role or auth_ctx.get('role'),
            'customer_key': account.customer_key or auth_ctx.get('customer_key'),
        })
        set_jwt_cookie(response, token)
        Account.objects.filter(pk=account.id).update(last_login_at=timezone.now())
        audit(
            'ADMIN_LOGIN_SUCCESS',
            {'username': account.username, 'account_id': account.id},
            get_client_ip(request),
            customer_key=account.customer_key or auth_ctx.get('customer_key'),
        )
        return response

    # Legacy-Fallback fuer bestehende Setups ohne angelegte Accounts.
    if normalized_username == normalize_username(ADMIN_USERNAME) and verify_admin_password(password, customer_key=requested_customer_key):
        auth_ctx = get_auth_context(customer_key=requested_customer_key)
        token = create_jwt_token(
            normalized_username,
            role=auth_ctx.get('role'),
            customer_key=auth_ctx.get('customer_key'),
        )
        response = success_response({
            'id': 0,
            'account_id': None,
            'username': normalized_username,
            'email': ADMIN_EMAIL,
            'role': auth_ctx.get('role'),
            'customer_key': auth_ctx.get('customer_key'),
            'legacy_login': True,
        })
        set_jwt_cookie(response, token)
        audit(
            'ADMIN_LOGIN_SUCCESS_LEGACY',
            {'username': normalized_username},
            get_client_ip(request),
            customer_key=auth_ctx.get('customer_key'),
        )
        return response

    audit('ADMIN_LOGIN_FAILED', {'username': normalized_username}, get_client_ip(request), customer_key=requested_customer_key)
    return unauthorized_response('Invalid username or password')


@csrf_exempt
@require_http_methods(['POST'])
def logout(request):
    token = get_token_from_request(request)
    if token:
        payload = verify_jwt_token(token)
        username = payload.get('sub', 'unknown') if payload else 'unknown'
        customer_key = payload.get('customer_key', 'default') if payload else 'default'
        audit('ADMIN_LOGOUT', {'username': username}, get_client_ip(request), customer_key=customer_key)

    response = success_response(None)
    delete_jwt_cookie(response)
    return response


@require_http_methods(['GET'])
def me(request):
    token = get_token_from_request(request)
    if not token:
        return unauthorized_response('Not authenticated')

    payload = verify_jwt_token(token)
    if not payload:
        return unauthorized_response('Invalid or expired token')

    return success_response({
        'id': 1,
        'username': payload.get('sub', 'admin'),
        'email': ADMIN_EMAIL,
        'role': payload.get('role'),
        'customer_key': payload.get('customer_key'),
        'account_id': payload.get('account_id'),
    })
