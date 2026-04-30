"""
Employee-Device-Endpoints: anonyme Geraeteregistrierung fuer Mitarbeiter.
"""
import json

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.helpers import error_response, success_response
from api.services.employee_device_service import (
    create_employee_csrf_token,
    ensure_employee_device,
    get_device_token_from_request,
    get_employee_csrf_token_from_request,
    get_employee_device_from_token,
    set_employee_csrf_cookie,
    set_employee_device_cookie,
    touch_employee_device,
)
from api.services.tenant_service import get_employee_request_customer_key


def _serialize_device(device) -> dict:
    return {
        'id': device.id,
        'display_name': device.display_name,
        'is_active': device.is_active,
        'last_seen_at': device.last_seen_at.isoformat() if device.last_seen_at else None,
    }


@csrf_exempt
@require_http_methods(['POST'])
def init_employee_device(request):
    try:
        body = json.loads(request.body) if request.body else {}
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    if body is None:
        body = {}
    if not isinstance(body, dict):
        return error_response('Invalid request format', 400)

    customer_key = get_employee_request_customer_key(request)
    display_name = (body.get('displayName') or '').strip()
    existing_token = get_device_token_from_request(request)

    if existing_token:
        device = get_employee_device_from_token(existing_token, customer_key)
        if device:
            touch_employee_device(device, display_name=display_name)
            response = success_response({
                'device': _serialize_device(device),
                'created': False,
            })
            csrf_token = get_employee_csrf_token_from_request(request) or create_employee_csrf_token()
            set_employee_csrf_cookie(response, csrf_token)
            return response

    device, token, _ = ensure_employee_device(customer_key=customer_key, display_name=display_name)
    response = success_response({
        'device': _serialize_device(device),
        'created': True,
    })
    set_employee_csrf_cookie(response, create_employee_csrf_token())
    set_employee_device_cookie(response, token)
    return response
