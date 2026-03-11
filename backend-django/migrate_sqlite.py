"""
migrate_sqlite.py – Einmaliges Migrations-Script: SQLite → PostgreSQL

Verwendung:
  cd backend-django
  python migrate_sqlite.py ../backend/database.sqlite

Voraussetzung: Django-Migrations bereits ausgeführt (python manage.py migrate)
"""
import os
import sys
import json
import sqlite3

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mitarbeiterapp.settings')

from dotenv import load_dotenv
load_dotenv()

import django
django.setup()

from api.models import AdminConfig, User, Timesheet, PdfLog
from api.services.tenant_service import get_default_customer_key


def migrate(sqlite_path: str):
    customer_key = get_default_customer_key()
    if not os.path.exists(sqlite_path):
        print(f'SQLite-Datei nicht gefunden: {sqlite_path}')
        sys.exit(1)

    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # admin_config
    try:
        cur.execute('SELECT id, configData FROM admin_config WHERE id = 1')
        row = cur.fetchone()
        if row:
            config_data = json.loads(row['configData']) if row['configData'] else {}
            AdminConfig.objects.update_or_create(
                customer_key=customer_key,
                defaults={'config_data': config_data}
            )
            print('✓ admin_config migriert')
        else:
            print('- admin_config: keine Daten gefunden')
    except Exception as e:
        print(f'✗ admin_config Fehler: {e}')

    # users
    try:
        cur.execute('SELECT id, firstName, lastName, language FROM users WHERE id = 1')
        row = cur.fetchone()
        if row:
            User.objects.update_or_create(
                customer_key=customer_key,
                defaults={
                    'first_name': row['firstName'] or '',
                    'last_name': row['lastName'] or '',
                    'language': row['language'] or 'de',
                }
            )
            print('✓ users migriert')
        else:
            print('- users: keine Daten gefunden')
    except Exception as e:
        print(f'✗ users Fehler: {e}')

    # timesheets
    try:
        cur.execute('SELECT id, userId, weekData FROM timesheets WHERE id = 1')
        row = cur.fetchone()
        if row:
            week_data = json.loads(row['weekData']) if row['weekData'] else []
            Timesheet.objects.update_or_create(
                customer_key=customer_key,
                user_id=1,
                defaults={'week_data': week_data}
            )
            print('✓ timesheets migriert')
        else:
            print('- timesheets: keine Daten gefunden')
    except Exception as e:
        print(f'✗ timesheets Fehler: {e}')

    # pdf_logs
    try:
        cur.execute('SELECT * FROM pdf_logs')
        rows = cur.fetchall()
        count = 0
        for row in rows:
            PdfLog.objects.get_or_create(
                id=row['id'],
                defaults={
                    'customer_key': customer_key,
                    'employee_name': row['employee_name'] or '',
                    'document_type': row['document_type'] or '',
                    'recipient_email': row['recipient_email'] or '',
                    'recipient_whatsapp': row['recipient_whatsapp'] or '',
                    'filename': row['filename'] or '',
                    'week_number': row['week_number'],
                    'week_year': row['week_year'],
                    'status': row['status'] or 'sent',
                }
            )
            count += 1
        print(f'✓ pdf_logs: {count} Einträge migriert')
    except Exception as e:
        print(f'✗ pdf_logs Fehler: {e}')

    conn.close()
    print('\nMigration abgeschlossen.')


if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '../backend/database.sqlite'
    migrate(path)
