from django.db import migrations


def sync_postgres_sequences(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    table_names = [
        'admin_config',
        'users',
        'timesheets',
        'pdf_logs',
        'audit_log',
    ]

    with schema_editor.connection.cursor() as cursor:
        for table in table_names:
            cursor.execute(
                f"""
                SELECT setval(
                    pg_get_serial_sequence(%s, 'id'),
                    COALESCE((SELECT MAX(id) FROM {table}), 1),
                    true
                )
                """,
                [table],
            )


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0002_tenant_scope'),
    ]

    operations = [
        migrations.RunPython(sync_postgres_sequences, migrations.RunPython.noop),
    ]
