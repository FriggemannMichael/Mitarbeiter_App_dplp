from django.db import models


class AdminConfig(models.Model):
    customer_key = models.CharField(max_length=100, default='default', db_index=True)
    config_data = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admin_config'

    def __str__(self):
        return f'AdminConfig #{self.pk}'


class Account(models.Model):
    customer_key = models.CharField(max_length=100, default='default', db_index=True)
    username = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=50, default='customer_admin')
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts'
        constraints = [
            models.UniqueConstraint(
                fields=['customer_key', 'username'],
                name='uniq_account_customer_username',
            ),
        ]
        indexes = [
            models.Index(fields=['customer_key', 'is_active'], name='idx_accounts_tenant_active'),
        ]

    def __str__(self):
        return f'{self.customer_key}:{self.username} ({self.role})'


class User(models.Model):
    customer_key = models.CharField(max_length=100, default='default', db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    language = models.CharField(max_length=5, default='de')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f'{self.first_name} {self.last_name}'


class EmployeeDevice(models.Model):
    customer_key = models.CharField(max_length=100, default='default', db_index=True)
    token_hash = models.CharField(max_length=64)
    display_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'employee_devices'
        constraints = [
            models.UniqueConstraint(
                fields=['customer_key', 'token_hash'],
                name='uniq_employee_device_token_per_customer',
            ),
        ]
        indexes = [
            models.Index(
                fields=['customer_key', 'is_active'],
                name='idx_empdev_tenant_active',
            ),
        ]

    def __str__(self):
        label = self.display_name or f'device-{self.pk}'
        return f'{self.customer_key}:{label}'


class Timesheet(models.Model):
    customer_key = models.CharField(max_length=100, default='default', db_index=True)
    user_id = models.IntegerField(default=1)
    employee_device = models.ForeignKey(
        EmployeeDevice,
        on_delete=models.CASCADE,
        related_name='timesheets',
        null=True,
        blank=True,
    )
    week_year = models.IntegerField(null=True, blank=True)
    week_number = models.IntegerField(null=True, blank=True)
    sheet_id = models.CharField(max_length=50, default='default')
    week_data = models.JSONField()
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_reason = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'timesheets'
        constraints = [
            models.UniqueConstraint(
                fields=['customer_key', 'employee_device', 'week_year', 'week_number', 'sheet_id'],
                name='uniq_timesheet_device_week_sheet',
            ),
        ]
        indexes = [
            models.Index(
                fields=['customer_key', 'employee_device', 'week_year', 'week_number'],
                name='idx_timesheets_device_week',
            ),
        ]


class PdfLog(models.Model):
    customer_key = models.CharField(max_length=100, default='default', db_index=True)
    employee_name = models.CharField(max_length=255, blank=True)
    document_type = models.CharField(max_length=50, blank=True)
    recipient_email = models.TextField(blank=True)
    recipient_whatsapp = models.CharField(max_length=50, blank=True)
    filename = models.CharField(max_length=255, blank=True)
    week_number = models.IntegerField(null=True, blank=True)
    week_year = models.IntegerField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='sent')

    class Meta:
        db_table = 'pdf_logs'


class AuditLog(models.Model):
    customer_key = models.CharField(max_length=100, default='default', db_index=True)
    action = models.CharField(max_length=100)
    details = models.JSONField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_log'
