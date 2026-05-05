"""
Management Command: seed_config

Spielt eine initiale Kunden-Config in die DB ein – aber NUR wenn die DB
noch leer ist (kein bestehender Eintrag). Sicher fuer wiederholte Ausfuehrung.

Suchreihenfolge fuer die Seed-Datei:
1. seed_config.json  (neben docker-compose, nicht im Repo – kundenspezifisch)
2. config-example.json  (neutrale Platzhalter, im Repo)
3. Nichts tun

Aufruf: python manage.py seed_config
"""
import json
import os

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Spielt initiale Config in die DB ein wenn sie leer ist'

    def handle(self, *args, **options):
        from api.models import AdminConfig
        from api.services.tenant_service import get_default_customer_key

        customer_key = get_default_customer_key()

        if AdminConfig.objects.filter(customer_key=customer_key).exists():
            self.stdout.write(f'Config fuer "{customer_key}" bereits vorhanden – uebersprungen.')
            return

        config = self._load_seed_file()
        if config is None:
            self.stdout.write('Keine Seed-Datei gefunden – uebersprungen.')
            return

        AdminConfig.objects.create(customer_key=customer_key, config_data=config)
        self.stdout.write(self.style.SUCCESS(f'Config fuer "{customer_key}" erfolgreich eingespielt.'))

    def _load_seed_file(self):
        base_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..')

        for filename in ('seed_config.json', 'config-example.json'):
            path = os.path.normpath(os.path.join(base_dir, filename))
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    self.stdout.write(f'Lade Seed aus: {filename}')
                    return json.load(f)

        return None
