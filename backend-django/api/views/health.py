import sys
from django.db import connection
from django.views.decorators.http import require_http_methods
from api.helpers import success_response, error_response


@require_http_methods(['GET'])
def health(request):
    db_status = 'unknown'
    try:
        connection.ensure_connection()
        db_status = 'connected'
    except Exception as e:
        db_status = f'error: {str(e)}'

    return success_response({
        'status': 'ok',
        'version': '1.0.0-django',
        'database': db_status,
        'python_version': sys.version.split(' ')[0],
    })
