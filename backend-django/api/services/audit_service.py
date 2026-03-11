"""Audit-Logging: tenant-scoped."""


def audit(action: str, details: dict = None, ip: str = None, customer_key: str = 'default'):
    try:
        from api.models import AuditLog
        AuditLog.objects.create(
            action=action,
            details=details or {},
            ip=ip or None,
            customer_key=customer_key or 'default',
        )
    except Exception:
        # Audit-Fehler duerfen nie die eigentliche Anfrage blockieren.
        pass
