# RBAC Rollenmodell (Django)

Stand: 2026-03-11

## Zweck

Dieses Dokument definiert die Rollenbasis fuer die schrittweise SaaS-Integration
(`MitarbeiterappSaaS`) im bestehenden Django-Backend.

## Rollen

1. `employee`
- Externer Mitarbeiter.
- Zugriff nur auf eigene Daten im zugewiesenen Mandanten.

2. `dispatcher`
- Disponent beim Kunden.
- Operativer Zugriff im eigenen Mandanten.

3. `branch_manager`
- NL-Leiter beim Kunden.
- Erweiterter Zugriff/Freigaben im eigenen Mandanten.

4. `backoffice`
- Verwaltung beim Kunden.
- Administrative Kundenprozesse im eigenen Mandanten.

5. `customer_admin`
- Hauptadministrator des Kunden.
- Voller Zugriff im eigenen Mandanten (inkl. Admin-Panel).

6. `platform_owner`
- Plattformbetreiber (mandantenuebergreifend).

## Aktuelle technische Umsetzung (Step 1 + Step 2)

1. JWT-Claims enthalten jetzt:
- `role`
- `customer_key`

2. Neue RBAC-Bausteine:
- Rollen-Konstanten in `api/services/auth_service.py`
- `@require_roles(...)` Decorator

3. Bereits geschuetzte Admin-Endpunkte:
- `GET /api/get-admin-config`
- `PUT /api/save-admin-config`
- `POST /api/change-password`
- `POST /api/test-email`

4. Tenant-Scoping in Datenzugriffen:
- `AdminConfig` wird per `customer_key` geladen/gespeichert.
- `save-user/get-user` sind tenant-scoped.
- `save-timesheet/get-timesheet` sind tenant-scoped.
- PDF/Audit-Logs speichern `customer_key`.
- `customer_key` wird aus JWT/Header/Query/Body aufgeloest.

## Environment-Variablen

In `backend-django/.env.app`:

```env
ADMIN_ROLE=customer_admin
CUSTOMER_KEY=default
```

Hinweis:
- `ADMIN_ROLE` bestimmt die Rolle fuer den aktuellen Admin-Login.
- `CUSTOMER_KEY` bestimmt den Mandantenkontext im JWT.

## Naechste Schritte (Step 3+)

1. Benutzerverwaltung mit mehreren Accounts/Rollen einführen.
2. Frontend-Views/Buttons per Rolle + `feature_flags` steuern.
3. Plattform-Admin-Funktionen (`platform_owner`) separieren.
4. Tenant-Policy-Tests (Isolation/Leak-Tests) automatisieren.
