"""
User-Endpoints: save-user, get-user
Tenant-scoped ueber customer_key.
"""
import json

from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from api.helpers import success_response, error_response
from api.models import User
from api.services.tenant_service import get_request_customer_key


@csrf_exempt
@require_http_methods(['POST'])
def save_user(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    first_name = body.get('firstName', '').strip()
    last_name = body.get('lastName', '').strip()
    language = body.get('language', 'de').strip()

    if not first_name or not last_name:
        return error_response('firstName and lastName required', 400)

    customer_key = get_request_customer_key(request, body=body)
    User.objects.update_or_create(
        customer_key=customer_key,
        defaults={
            'first_name': first_name,
            'last_name': last_name,
            'language': language,
        }
    )
    return success_response(None)


@require_http_methods(['GET'])
def get_user(request):
    customer_key = get_request_customer_key(request)
    user = (
        User.objects
        .filter(customer_key=customer_key)
        .order_by('-updated_at', '-id')
        .first()
    )
    if not user:
        return success_response(None)
    return success_response({
        'firstName': user.first_name,
        'lastName': user.last_name,
        'language': user.language,
    })
