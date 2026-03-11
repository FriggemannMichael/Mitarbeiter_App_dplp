"""
Email-Endpoints: test-email, send-pdf
Identisches Verhalten wie PHP handleTestEmail() und handleSendPdf().
"""
import json
import re
from django.conf import settings
from django.core.cache import cache
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from api.helpers import success_response, error_response, get_client_ip
from api.services.auth_service import (
    require_roles,
    ROLE_BACKOFFICE,
    ROLE_CUSTOMER_ADMIN,
    ROLE_PLATFORM_OWNER,
)
from api.services.email_service import send_test_email, send_pdf
from api.services.audit_service import audit
from api.services.tenant_service import get_request_customer_key

_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _check_rate_limit(ip: str) -> bool:
    """Max. PDF_RATE_LIMIT Requests pro IP pro Minute. Atomisch über Django-Cache."""
    if not ip:
        return True
    key = f"ratelimit:sendpdf:{ip}"
    cache.add(key, 0, timeout=60)  # setzt nur wenn noch nicht vorhanden
    count = cache.incr(key)
    return count <= getattr(settings, 'PDF_RATE_LIMIT', 10)


def _check_api_secret(request) -> bool:
    """Prüft X-Api-Key Header gegen PDF_API_SECRET aus .env. Deaktiviert wenn Secret leer."""
    secret = getattr(settings, 'PDF_API_SECRET', '')
    if not secret:
        return True  # Schutz deaktiviert wenn kein Secret konfiguriert
    return request.headers.get('X-Api-Key', '') == secret


@csrf_exempt
@require_roles(ROLE_BACKOFFICE, ROLE_CUSTOMER_ADMIN, ROLE_PLATFORM_OWNER)
@require_http_methods(['POST'])
def test_email(request):
    """POST /api/test-email – Auth erforderlich"""
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    recipient = body.get('recipient_email', '').strip()
    if not recipient or '@' not in recipient:
        return error_response('Valid recipient_email required', 400)

    customer_key = get_request_customer_key(request, body=body)
    result = send_test_email(recipient)
    if result['success']:
        audit('TEST_EMAIL_SENT', {'recipient': recipient}, get_client_ip(request), customer_key=customer_key)
        return success_response(result['data'])
    else:
        audit('TEST_EMAIL_FAILED', {'recipient': recipient, 'error': result['error']}, get_client_ip(request), customer_key=customer_key)
        return error_response(result['error'], 500)


@csrf_exempt
@require_http_methods(['POST'])
def send_pdf_view(request):
    """POST /send-pdf – öffentlich, KEIN /api/ Prefix!"""
    ip = get_client_ip(request)

    customer_key = get_request_customer_key(request)
    if not _check_rate_limit(ip):
        audit('PDF_RATE_LIMITED', {'ip': ip}, ip, customer_key=customer_key)
        return error_response('Too many requests. Please try again later.', 429)

    if not _check_api_secret(request):
        audit('PDF_UNAUTHORIZED', {'ip': ip}, ip, customer_key=customer_key)
        return error_response('Unauthorized', 401)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    required = ['pdf_base64', 'recipient_email']
    for field in required:
        if not body.get(field):
            return error_response(f'{field} is required', 400)

    if not _EMAIL_RE.match(body['recipient_email'].strip()):
        return error_response('recipient_email is not a valid email address', 400)

    body['customer_key'] = get_request_customer_key(request, body=body)
    result = send_pdf(body)
    if result['success']:
        audit('PDF_SENT', {
            'document_type': body.get('document_type', 'unknown'),
            'recipient': body.get('recipient_email'),
            'employee': body.get('employee_name'),
        }, get_client_ip(request), customer_key=body.get('customer_key'))
        return success_response(result['data'])
    else:
        audit('PDF_SEND_FAILED', {
            'recipient': body.get('recipient_email'),
            'error': result['error'],
        }, get_client_ip(request), customer_key=body.get('customer_key'))
        return error_response(result['error'], 500)
