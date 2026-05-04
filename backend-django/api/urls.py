from django.urls import path
from api.views.health import health
from api.views.auth import login, logout, me
from api.views.employee_auth import (
    employee_login,
    employee_logout,
    employee_register,
    employee_reset_pin,
    employee_session,
)
from api.views.config import app_config, admin_config, save_admin_config, change_password
from api.views.accounts import list_accounts, create_account, update_account
from api.views.employee_device import init_employee_device
from api.views.users import save_user, get_user
from api.views.timesheets import save_timesheet, get_timesheet, list_timesheets, archive_timesheet
from api.views.email import test_email, send_pdf_view
from api.views.customer_portal import (
    portal_summary,
    portal_employees,
    portal_timesheets,
    portal_absences,
    portal_audit_log,
    portal_add_timesheet_comment,
    portal_update_timesheet_status,
    portal_timesheets_csv,
)

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
    path('api/employee/register', employee_register),
    path('api/employee/login', employee_login),
    path('api/employee/logout', employee_logout),
    path('api/employee/session', employee_session),
    path('api/employee/reset-pin', employee_reset_pin),

    # User
    path('api/save-user', save_user),
    path('api/get-user', get_user),

    # Timesheet
    path('api/save-timesheet', save_timesheet),
    path('api/get-timesheet', get_timesheet),
    path('api/list-timesheets', list_timesheets),
    path('api/archive-timesheet', archive_timesheet),
    path('api/portal/summary', portal_summary),
    path('api/portal/employees', portal_employees),
    path('api/portal/timesheets', portal_timesheets),
    path('api/portal/absences', portal_absences),
    path('api/portal/audit-log', portal_audit_log),
    path('api/portal/timesheets.csv', portal_timesheets_csv),
    path('api/portal/timesheets/<int:timesheet_id>/comment', portal_add_timesheet_comment),
    path('api/portal/timesheets/<int:timesheet_id>/status', portal_update_timesheet_status),

    # Email + PDF – ACHTUNG: send-pdf hat KEIN /api/ Prefix (wie PHP)
    path('api/test-email', test_email),
    path('send-pdf', send_pdf_view),
    path('api/send-pdf', send_pdf_view),    # Alias (PHP hatte beide Pfade)
    path('api/send-email', send_pdf_view),  # Alias
]
