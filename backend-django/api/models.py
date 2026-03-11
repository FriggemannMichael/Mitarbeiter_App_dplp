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


class Timesheet(models.Model):
    customer_key = models.CharField(max_length=100, default='default', db_index=True)
    user_id = models.IntegerField(default=1)
    week_data = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'timesheets'


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
