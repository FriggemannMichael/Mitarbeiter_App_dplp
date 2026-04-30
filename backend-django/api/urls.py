from django.urls import path
from api.views.health import health
from api.views.auth import login, logout, me
from api.views.config import app_config, admin_config, save_admin_config, change_password
from api.views.accounts import list_accounts, create_account, update_account
from api.views.employee_device import init_employee_device
from api.views.users import save_user, get_user
from api.views.timesheets import save_timesheet, get_timesheet, list_timesheets
from api.views.email import test_email, send_pdf_view

urlpatterns = [
    # Root → Health (verhindert Django 404 Debug-Seite)
    path('', health),
    path('health', health),

    # Auth
    path('auth/login', login),
    path('auth/logout', logout),
    path('auth/me', me),

    # Config (öffentlich)
    path('api/get-app-config', app_config),

    # Config (Admin)
    path('api/get-admin-config', admin_config),
    path('api/save-admin-config', save_admin_config),
    path('api/change-password', change_password),
    path('api/accounts', list_accounts),
    path('api/accounts/create', create_account),
    path('api/accounts/<int:account_id>', update_account),
    path('api/employee-device/init', init_employee_device),

    # User
    path('api/save-user', save_user),
    path('api/get-user', get_user),

    # Timesheet
    path('api/save-timesheet', save_timesheet),
    path('api/get-timesheet', get_timesheet),
    path('api/list-timesheets', list_timesheets),

    # Email + PDF – ACHTUNG: send-pdf hat KEIN /api/ Prefix (wie PHP)
    path('api/test-email', test_email),
    path('send-pdf', send_pdf_view),
    path('api/send-pdf', send_pdf_view),    # Alias (PHP hatte beide Pfade)
    path('api/send-email', send_pdf_view),  # Alias
]
