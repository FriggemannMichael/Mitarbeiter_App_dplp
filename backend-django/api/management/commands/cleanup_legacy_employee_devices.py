from django.core.management.base import BaseCommand

from api.services.employee_auth_service import cleanup_legacy_device_timesheets


class Command(BaseCommand):
    help = (
        'Bereinigt alte device-gebundene Stundenzettel und ordnet sie '
        'eindeutigen Mitarbeiterprofilen zu.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--customer-key',
            dest='customer_key',
            default='',
            help='Optional nur einen Mandanten bereinigen.',
        )

    def handle(self, *args, **options):
        result = cleanup_legacy_device_timesheets(
            customer_key=(options.get('customer_key') or '').strip() or None,
        )
        self.stdout.write(
            self.style.SUCCESS(
                'Legacy-Device-Cleanup abgeschlossen: '
                f"migriert={result['migrated_count']}, "
                f"zusammengeführt={result['merged_count']}, "
                f"ohne Profil={result['unresolved_missing_profile']}, "
                f"Namenskonflikte={result['unresolved_duplicate_name']}"
            )
        )
