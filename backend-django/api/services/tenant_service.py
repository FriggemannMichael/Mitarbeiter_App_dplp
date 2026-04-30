"""Tenant-Helfer: ermittelt customer_key aus Request/JWT/Header/Body."""
import os


def _normalize_customer_key(value: str | None) -> str:
    if not isinstance(value, str):
        return ''
    normalized = value.strip()
    if not normalized:
        return ''
    return normalized[:100]


def get_default_customer_key() -> str:
    return _normalize_customer_key(os.environ.get('CUSTOMER_KEY')) or 'default'


def get_request_customer_key(request, body: dict | None = None) -> str:
    """
    Prioritaet:
    1. JWT-Claim request.admin_user.customer_key
    2. Header X-Customer-Key
    3. Querystring customer_key
    4. Request-Body customerKey/customer_key
    5. Env CUSTOMER_KEY
    """
    admin_user = getattr(request, 'admin_user', None) or {}
    key = _normalize_customer_key(admin_user.get('customer_key'))
    if key:
        return key

    key = _normalize_customer_key(request.headers.get('X-Customer-Key', ''))
    if key:
        return key

    key = _normalize_customer_key(request.GET.get('customer_key', ''))
    if key:
        return key

    if isinstance(body, dict):
        key = _normalize_customer_key(body.get('customerKey') or body.get('customer_key'))
        if key:
            return key

    return get_default_customer_key()


def get_employee_request_customer_key(request) -> str:
    """
    Employee-Endpoints duerfen keinen frei gelieferten customer_key aus
    Header/Query/Body vertrauen. Fuer den anonymen Mitarbeiter-Flow wird der
    Tenant deshalb serverseitig festgelegt.
    """
    admin_user = getattr(request, 'admin_user', None) or {}
    key = _normalize_customer_key(admin_user.get('customer_key'))
    if key:
        return key

    return get_default_customer_key()
