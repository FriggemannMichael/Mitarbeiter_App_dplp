import os

from django.db import migrations, models


VALID_ROLES = {
    'employee',
    'dispatcher',
    'branch_manager',
    'backoffice',
    'customer_admin',
    'platform_owner',
}


def _normalize_role(value: str | None) -> str:
    candidate = (value or '').strip().lower()
    return candidate if candidate in VALID_ROLES else 'customer_admin'


def create_legacy_admin_accounts(apps, schema_editor):
    AdminConfig = apps.get_model('api', 'AdminConfig')
    Account = apps.get_model('api', 'Account')

    admin_username = (os.environ.get('ADMIN_USERNAME', 'admin') or 'admin').strip()
    env_password_hash = (os.environ.get('ADMIN_PASSWORD_HASH', '') or '').strip()
    env_role = _normalize_role(os.environ.get('ADMIN_ROLE', 'customer_admin'))
    default_customer_key = (os.environ.get('CUSTOMER_KEY', 'default') or 'default').strip()
    admin_email = (
        os.environ.get('ADMIN_EMAIL')
        or os.environ.get('RECIPIENT_EMAIL')
        or ''
    ).strip()

    customer_keys = {default_customer_key}
    customer_keys.update(
        ck
        for ck in AdminConfig.objects.values_list('customer_key', flat=True).distinct()
        if isinstance(ck, str) and ck.strip()
    )

    for customer_key in customer_keys:
        config = (
            AdminConfig.objects
            .filter(customer_key=customer_key)
            .order_by('-updated_at', '-id')
            .values_list('config_data', flat=True)
            .first()
        ) or {}
        admin_section = (config.get('admin') or {}) if isinstance(config, dict) else {}

        role = _normalize_role(admin_section.get('role') or env_role)
        password_hash = (admin_section.get('password_hash') or env_password_hash or '').strip()
        if not password_hash:
            continue

        exists = Account.objects.filter(
            customer_key=customer_key,
            username__iexact=admin_username,
        ).exists()
        if exists:
            continue

        Account.objects.create(
            customer_key=customer_key,
            username=admin_username,
            email=admin_email,
            password_hash=password_hash,
            role=role,
            is_active=True,
        )


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0003_sync_postgres_sequences'),
    ]

    operations = [
        migrations.CreateModel(
            name='Account',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('customer_key', models.CharField(db_index=True, default='default', max_length=100)),
                ('username', models.CharField(max_length=150)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('password_hash', models.CharField(max_length=255)),
                ('role', models.CharField(default='customer_admin', max_length=50)),
                ('is_active', models.BooleanField(default=True)),
                ('last_login_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'accounts',
            },
        ),
        migrations.AddConstraint(
            model_name='account',
            constraint=models.UniqueConstraint(fields=('customer_key', 'username'), name='uniq_account_customer_username'),
        ),
        migrations.AddIndex(
            model_name='account',
            index=models.Index(fields=['customer_key', 'is_active'], name='idx_accounts_tenant_active'),
        ),
        migrations.RunPython(create_legacy_admin_accounts, migrations.RunPython.noop),
    ]
