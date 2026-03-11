"""
Timesheet-Endpoints: save-timesheet, get-timesheet
Tenant-scoped ueber customer_key.
"""
import json

from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from api.helpers import success_response, error_response
from api.models import Timesheet
from api.services.tenant_service import get_request_customer_key


@csrf_exempt
@require_http_methods(['POST'])
def save_timesheet(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return error_response('Invalid JSON', 400)

    week_data = body.get('weekData')
    if week_data is None:
        return error_response('weekData required', 400)

    customer_key = get_request_customer_key(request, body=body)
    Timesheet.objects.update_or_create(
        customer_key=customer_key,
        user_id=1,
        defaults={
            'week_data': week_data,
        }
    )
    return success_response(None)


@require_http_methods(['GET'])
def get_timesheet(request):
    customer_key = get_request_customer_key(request)
    ts = (
        Timesheet.objects
        .filter(customer_key=customer_key, user_id=1)
        .order_by('-updated_at', '-id')
        .first()
    )
    if not ts:
        return success_response(None)
    return success_response(ts.week_data)
