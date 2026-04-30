from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0004_accounts'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmployeeDevice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('customer_key', models.CharField(db_index=True, default='default', max_length=100)),
                ('token_hash', models.CharField(max_length=64)),
                ('display_name', models.CharField(blank=True, max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_seen_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'employee_devices',
            },
        ),
        migrations.AddField(
            model_name='timesheet',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='timesheet',
            name='employee_device',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='timesheets', to='api.employeedevice'),
        ),
        migrations.AddField(
            model_name='timesheet',
            name='sheet_id',
            field=models.CharField(default='default', max_length=50),
        ),
        migrations.AddField(
            model_name='timesheet',
            name='week_number',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='timesheet',
            name='week_year',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name='employeedevice',
            constraint=models.UniqueConstraint(fields=('customer_key', 'token_hash'), name='uniq_employee_device_token_per_customer'),
        ),
        migrations.AddIndex(
            model_name='employeedevice',
            index=models.Index(fields=['customer_key', 'is_active'], name='idx_empdev_tenant_active'),
        ),
        migrations.AddConstraint(
            model_name='timesheet',
            constraint=models.UniqueConstraint(fields=('customer_key', 'employee_device', 'week_year', 'week_number', 'sheet_id'), name='uniq_timesheet_device_week_sheet'),
        ),
        migrations.AddIndex(
            model_name='timesheet',
            index=models.Index(fields=['customer_key', 'employee_device', 'week_year', 'week_number'], name='idx_timesheets_device_week'),
        ),
        migrations.RunSQL(
            sql="UPDATE timesheets SET created_at = updated_at WHERE created_at IS NULL",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name='timesheet',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
