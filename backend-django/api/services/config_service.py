"""
Config-Service: Laden, Speichern, Mergen, Legacy-Key-Migration.
Tenant-scoped ueber customer_key.
"""
import base64
import bcrypt

from api.services.crypto_service import encrypt
from api.services.tenant_service import get_default_customer_key


def migrate_legacy_keys(config: dict) -> dict:
    if not isinstance(config, dict):
        return {}

    pdf = config.get('pdf', {})
    if isinstance(pdf, dict):
        if not pdf.get('advance_payment_header') and pdf.get('sick_leave_header'):
            pdf['advance_payment_header'] = pdf['sick_leave_header']
        if 'legal_notice_advance_payment' not in pdf and 'legal_notice_sick_leave' in pdf:
            pdf['legal_notice_advance_payment'] = pdf['legal_notice_sick_leave']
        pdf.pop('sick_leave_header', None)
        pdf.pop('legal_notice_sick_leave', None)
        config['pdf'] = pdf

    technical = config.get('technical', {})
    if isinstance(technical, dict):
        if not technical.get('qr_code_type_advance_payment') and technical.get('qr_code_type_sick_leave'):
            technical['qr_code_type_advance_payment'] = technical['qr_code_type_sick_leave']
        technical.pop('qr_code_type_sick_leave', None)
        technical.pop('feature_sick_leave', None)
        config['technical'] = technical

    return config


def load_config(customer_key: str | None = None) -> dict | None:
    from api.models import AdminConfig

    tenant = customer_key or get_default_customer_key()
    try:
        obj = (
            AdminConfig.objects
            .filter(customer_key=tenant)
            .order_by('-updated_at', '-id')
            .first()
        )
        if obj and obj.config_data:
            return migrate_legacy_keys(obj.config_data)
        return None
    except Exception:
        return None


def save_config(partial: dict, customer_key: str | None = None) -> bool:
    from api.models import AdminConfig

    tenant = customer_key or get_default_customer_key()
    partial = migrate_legacy_keys(partial)
    current = load_config(tenant) or {}

    admin = partial.get('admin', {})
    if admin.get('password'):
        hashed = bcrypt.hashpw(admin['password'].encode('utf-8'), bcrypt.gensalt())
        partial['admin']['password_hash'] = hashed.decode('utf-8')
        del partial['admin']['password']

    email = partial.get('email', {})
    if email.get('smtp_password'):
        partial['email']['smtp_password_encrypted'] = encrypt(email['smtp_password'])
        del partial['email']['smtp_password']

    merged = {**current}
    for key, value in partial.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value

    merged = migrate_legacy_keys(merged)

    try:
        obj = (
            AdminConfig.objects
            .filter(customer_key=tenant)
            .order_by('-updated_at', '-id')
            .first()
        )
        if obj:
            obj.config_data = merged
            obj.save()
        else:
            AdminConfig.objects.create(customer_key=tenant, config_data=merged)
        return True
    except Exception:
        return False


def get_app_config(customer_key: str | None = None) -> dict:
    tenant = customer_key or get_default_customer_key()
    config = load_config(tenant)

    if config is None:
        import json
        import os
        fallback_path = os.path.join(os.path.dirname(__file__), '..', '..', 'config-example.json')
        if os.path.exists(fallback_path):
            with open(fallback_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            source = 'file'
        else:
            config = {}
            source = 'empty'
    else:
        source = 'database'

    company = config.get('company', {})
    logo = company.get('company_logo', '')
    if logo and not logo.startswith('data:'):
        try:
            binary = bytes.fromhex(logo)
            b64 = base64.b64encode(binary).decode('utf-8')
            config['company']['company_logo'] = f'data:image/png;base64,{b64}'
        except (ValueError, Exception):
            pass

    return {'source': source, 'customer_key': tenant, 'data': config}
