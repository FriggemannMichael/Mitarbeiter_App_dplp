# Backend (Django + Docker)

Diese Anwendung nutzt produktiv das Django-Backend aus `backend-django/`.

Wichtige Doku:

1. Deployment (FTP + Docker): `docs/guides/DEPLOYMENT_FTP_DJANGO.md`
2. Gesamt-Deployment-Checkliste: `docs/DEPLOY.md`
3. Docker Compose Produktion: `backend-django/docker-compose.prod.yml`
4. Rollen/RBAC (Django): `docs/guides/RBAC_ROLES_DJANGO.md`

Kurzstart lokal:

```bash
cd backend-django
cp .env.example .env.app
cp .env.docker.example .env
docker compose up -d --build
docker compose exec web python manage.py migrate
```

Hinweise:

- Keine PHP-Backend-Anleitung mehr verwenden.
- Secrets niemals im Repository speichern.
- Fuer Produktion `DEBUG=False` und `JWT_COOKIE_SECURE=True` setzen.
