"""
Auth-Service: JWT als HTTP-only Cookie + bcrypt.

RBAC-Basis:
- Rollen werden als Claim im JWT abgelegt.
- customer_key wird als Mandanten-Claim abgelegt.
- account_id wird fuer Multi-User pro Tenant abgelegt.
"""
import os
from functools import wraps
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from api.helpers import unauthorized_response
from api.models import Account

# Rollen (SaaS-Roadmap-kompatibel)
ROLE_EMPLOYEE = 'employee'
ROLE_DISPATCHER = 'dispatcher'
ROLE_BRANCH_MANAGER = 'branch_manager'
ROLE_BACKOFFICE = 'backoffice'
ROLE_VIEWER = 'viewer'
ROLE_CUSTOMER_ADMIN = 'customer_admin'
ROLE_PLATFORM_OWNER = 'platform_owner'

VALID_ROLES = {
    ROLE_EMPLOYEE,
    ROLE_DISPATCHER,
    ROLE_BRANCH_MANAGER,
    ROLE_BACKOFFICE,
    ROLE_VIEWER,
    ROLE_CUSTOMER_ADMIN,
    ROLE_PLATFORM_OWNER,
}

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-jwt-secret')
JWT_EXPIRE_HOURS = int(os.environ.get('JWT_EXPIRE_HOURS', '8'))
JWT_COOKIE_NAME = os.environ.get('JWT_COOKIE_NAME', 'jwt')
JWT_COOKIE_SECURE = os.environ.get('JWT_COOKIE_SECURE', 'False').lower() in ('1', 'true', 'yes', 'on')

ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH', '')
ADMIN_ROLE = os.environ.get('ADMIN_ROLE', ROLE_CUSTOMER_ADMIN).strip().lower()
CUSTOMER_KEY = os.environ.get('CUSTOMER_KEY', 'default').strip() or 'default'


def _normalize_role(role: str | None) -> str:
    candidate = (role or '').strip().lower()
    return candidate if candidate in VALID_ROLES else ROLE_CUSTOMER_ADMIN


def normalize_username(username: str | None) -> str:
    return (username or '').strip().lower()


def verify_password_hash(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    try:
        hash_normalized = password_hash.replace('$2y$', '$2b$', 1)
        return bcrypt.checkpw(password.encode('utf-8'), hash_normalized.encode('utf-8'))
    except Exception:
        return False


def _get_active_password_hash(customer_key: str | None = None) -> str:
    """Config-Hash hat Vorrang vor Env-Var (change-password speichert in Config)."""
    try:
        from api.services.config_service import load_config
        tenant = customer_key or CUSTOMER_KEY
        config = load_config(tenant) or {}
        config_hash = config.get('admin', {}).get('password_hash', '')
        if config_hash:
            return config_hash
    except Exception:
        pass
    return ADMIN_PASSWORD_HASH


def get_auth_context(customer_key: str | None = None) -> dict:
    """
    Liefert Auth-Kontext fuer JWT-Claims.
    Prioritaet:
    1. DB-Config admin.role / technical.customer_key
    2. Env ADMIN_ROLE / CUSTOMER_KEY
    """
    role = _normalize_role(ADMIN_ROLE)
    customer_key_value = customer_key or CUSTOMER_KEY

    try:
        from api.services.config_service import load_config
        config = load_config(customer_key=customer_key_value) or {}
        config_role = (config.get('admin', {}) or {}).get('role')
        config_customer_key = (config.get('technical', {}) or {}).get('customer_key')
        role = _normalize_role(config_role or role)
        if isinstance(config_customer_key, str) and config_customer_key.strip():
            customer_key_value = config_customer_key.strip()
    except Exception:
        pass

    return {
        'role': role,
        'customer_key': customer_key_value,
    }


def get_login_account(username: str, customer_key: str) -> Account | None:
    username_normalized = normalize_username(username)
    if not username_normalized:
        return None
    return (
        Account.objects
        .filter(customer_key=customer_key, username__iexact=username_normalized, is_active=True)
        .order_by('-updated_at', '-id')
        .first()
    )


def verify_account_password(username: str, password: str, customer_key: str) -> Account | None:
    account = get_login_account(username=username, customer_key=customer_key)
    if not account:
        return None
    if not verify_password_hash(password, account.password_hash):
        return None
    return account


def verify_admin_password(password: str, customer_key: str | None = None) -> bool:
    """
    Legacy-Fallback: Verifiziert Passwort gegen tenant-spezifischen Admin-Hash.
    Dieser Weg bleibt fuer Abwaertskompatibilitaet erhalten.
    """
    active_hash = _get_active_password_hash(customer_key=customer_key)
    return verify_password_hash(password=password, password_hash=active_hash)


def create_jwt_token(
    username: str,
    role: str | None = None,
    customer_key: str | None = None,
    account_id: int | None = None,
) -> str:
    """Erstellt JWT Token mit Ablaufzeit und RBAC-Claims."""
    auth_ctx = get_auth_context(customer_key=customer_key)
    payload = {
        'sub': username,
        'role': _normalize_role(role or auth_ctx['role']),
        'customer_key': (customer_key or auth_ctx['customer_key']),
        'account_id': account_id,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def verify_jwt_token(token: str) -> dict | None:
    """Verifiziert JWT Token. Gibt Payload zurueck oder None bei Fehler."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_token_from_request(request) -> str | None:
    """Liest JWT aus Authorization-Header oder Cookie."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
        if token:
            return token

    return request.COOKIES.get(JWT_COOKIE_NAME)


def require_auth(view_func):
    """Decorator: Prueft JWT Cookie. Gibt 401 zurueck wenn nicht authentifiziert."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        token = get_token_from_request(request)
        if not token:
            return unauthorized_response('Admin authentication required')

        payload = verify_jwt_token(token)
        if not payload:
            return unauthorized_response('Invalid or expired token')

        request.admin_user = payload
        return view_func(request, *args, **kwargs)

    return wrapper


def require_roles(*allowed_roles: str):
    """
    Decorator: Prueft JWT + Rolle.
    Beispiel: @require_roles(ROLE_CUSTOMER_ADMIN, ROLE_PLATFORM_OWNER)
    """
    normalized_allowed = {_normalize_role(r) for r in allowed_roles if r}

    def decorator(view_func):
        @require_auth
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            payload = getattr(request, 'admin_user', {}) or {}
            role = _normalize_role(payload.get('role'))
            if role not in normalized_allowed:
                return unauthorized_response('Insufficient role permissions')
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


def set_jwt_cookie(response, token: str):
    """Setzt JWT als HTTP-only Cookie fuer Cross-Site-Frontend/API-Setup."""
    response.set_cookie(
        key=JWT_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite='None',
        secure=JWT_COOKIE_SECURE,
        max_age=JWT_EXPIRE_HOURS * 3600,
        path='/',
    )


def delete_jwt_cookie(response):
    """Loescht JWT Cookie beim Logout."""
    response.delete_cookie(
        key=JWT_COOKIE_NAME,
        samesite='None',
        path='/',
    )
