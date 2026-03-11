"""
Zentrale Response-Helper – identisches Format wie PHP ResponseHelper.
Alle Responses: {"success": true/false, "timestamp": "...", "data": {...}}
"""
from datetime import datetime
from django.http import JsonResponse


def success_response(data=None, status=200):
    return JsonResponse({
        'success': True,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'data': data,
    }, status=status)


def error_response(message, status=400):
    return JsonResponse({
        'success': False,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'error': message,
    }, status=status)


def unauthorized_response(message='Authentication required'):
    return error_response(message, status=401)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')
