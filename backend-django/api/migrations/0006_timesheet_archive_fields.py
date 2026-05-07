from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_employee_devices_and_timesheets'),
    ]

    operations = [
        migrations.AddField(
            model_name='timesheet',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='timesheet',
            name='archived_reason',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
