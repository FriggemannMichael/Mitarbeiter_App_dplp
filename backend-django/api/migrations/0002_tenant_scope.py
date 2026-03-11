from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='adminconfig',
            name='customer_key',
            field=models.CharField(db_index=True, default='default', max_length=100),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='customer_key',
            field=models.CharField(db_index=True, default='default', max_length=100),
        ),
        migrations.AddField(
            model_name='pdflog',
            name='customer_key',
            field=models.CharField(db_index=True, default='default', max_length=100),
        ),
        migrations.AddField(
            model_name='timesheet',
            name='customer_key',
            field=models.CharField(db_index=True, default='default', max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='customer_key',
            field=models.CharField(db_index=True, default='default', max_length=100),
        ),
    ]
