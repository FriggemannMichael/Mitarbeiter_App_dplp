"""
Email-Service: SMTP-Versand identisch zu PHP EmailService.php.

WICHTIG: SMTP kommt IMMER aus .env – nie aus der DB (wie PHP EmailService.php:69-76).
"""
import os
import re
import smtplib
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import formataddr
from django.conf import settings

_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_ENCRYPTION = os.environ.get('SMTP_ENCRYPTION', 'tls')
FROM_EMAIL = os.environ.get('FROM_EMAIL', '')
FROM_NAME = os.environ.get('FROM_NAME', 'Mitarbeiter Pro')
RECIPIENT_EMAIL = os.environ.get('RECIPIENT_EMAIL', '')


def _create_connection():
    """Erstellt SMTP-Verbindung aus .env (nie aus DB!)."""
    if not SMTP_HOST or not SMTP_USERNAME:
        raise ValueError('SMTP-Konfiguration ist unvollständig')

    if SMTP_ENCRYPTION.lower() == 'ssl':
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30)
    else:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
        if SMTP_ENCRYPTION.lower() == 'tls':
            server.starttls()

    server.login(SMTP_USERNAME, SMTP_PASSWORD)
    return server


def _should_simulate_email_send() -> bool:
    """
    Dev-Fallback: Simuliere Versand wenn explizit aktiviert oder
    wenn DEBUG aktiv ist und nur Placeholder-SMTP konfiguriert ist.
    """
    simulate_env = os.environ.get('EMAIL_SIMULATION', '').strip().lower()
    if simulate_env in ('1', 'true', 'yes', 'on'):
        return True

    if not getattr(settings, 'DEBUG', False):
        return False

    placeholder_host = SMTP_HOST in ('', 'smtp.ihre-domain.de')
    placeholder_user = SMTP_USERNAME in ('', 'info@ihre-domain.de')
    placeholder_password = SMTP_PASSWORD in ('', 'change_me')
    missing_from = FROM_EMAIL in ('', 'info@ihre-domain.de')

    return placeholder_host or placeholder_user or placeholder_password or missing_from


def send_test_email(recipient: str) -> dict:
    """Sendet Test-Email – identisch zu PHP EmailService.sendTestEmail()."""
    try:
        msg = MIMEText(
            f'Dies ist eine Test-Email von Ihrer Mitarbeiter Pro App.\n\n'
            f'SMTP-Konfiguration:\n'
            f'- Host: {SMTP_HOST}\n'
            f'- Port: {SMTP_PORT}\n'
            f'- Verschlüsselung: {SMTP_ENCRYPTION}\n'
            f'- Benutzername: {SMTP_USERNAME}\n\n'
            f'Wenn Sie diese Email erhalten, funktioniert Ihre SMTP-Konfiguration korrekt!\n\n'
            f'Mit freundlichen Grüßen\nIhr Mitarbeiter Pro System',
            'plain',
            'utf-8'
        )
        msg['Subject'] = 'Test-Email - Mitarbeiter Pro App'
        msg['From'] = formataddr((FROM_NAME, FROM_EMAIL))
        msg['To'] = recipient

        server = _create_connection()
        server.sendmail(FROM_EMAIL, [recipient], msg.as_string())
        server.quit()

        return {
            'success': True,
            'data': {
                'smtp_host': SMTP_HOST,
                'smtp_port': SMTP_PORT,
                'from_email': FROM_EMAIL,
            }
        }
    except Exception as e:
        return {'success': False, 'error': f'SMTP-Fehler: {str(e)}'}


def send_pdf(params: dict) -> dict:
    """
    Sendet PDF per Email – identisch zu PHP EmailService.sendPdf().
    Dual-Email: recipient_email + optional customer_email.
    Loggt in pdf_logs Tabelle.
    """
    try:
        pdf_base64 = params.get('pdf_base64', '')
        recipient_email = params.get('recipient_email', '')
        document_type = params.get('document_type', 'timesheet')
        employee_name = params.get('employee_name', 'Mitarbeiter')
        filename = params.get('filename', 'dokument.pdf')
        week_number = params.get('week_number', '')
        week_year = params.get('week_year', '')
        date_range = params.get('date_range', '')
        total_hours = params.get('total_hours', '')
        amount = params.get('amount', '')

        subject, body = _generate_email_content(
            document_type, employee_name, week_number, week_year,
            date_range, total_hours, amount
        )

        pdf_data = base64.b64decode(pdf_base64)

        customer_key = params.get('customer_key', 'default') or 'default'

        from api.services.config_service import load_config
        db_config = load_config(customer_key=customer_key) or {}
        cc_email = (
            db_config.get('technical', {}).get('pdf_review_cc_email', '').strip()
            or db_config.get('company', {}).get('default_email', '').strip()
        )

        cc_recipients = []
        if document_type == 'timesheet' and cc_email and _EMAIL_RE.match(cc_email):
            cc_recipients.append(cc_email)

        if _should_simulate_email_send():
            print(
                "[email_service] Simulierter E-Mail-Versand aktiv "
                f"(doc={document_type}, to={recipient_email}, file={filename})"
            )
            log_id = _log_pdf_send(
                customer_key,
                employee_name, document_type, recipient_email,
                cc_email if cc_recipients else '', filename,
                week_number, week_year, params.get('recipient_whatsapp', '')
            )
            return {
                'success': True,
                'data': {
                    'log_id': log_id,
                    'status': 'simulated',
                    'simulated': True,
                }
            }

        msg = MIMEMultipart()
        msg['Subject'] = subject
        msg['From'] = formataddr((FROM_NAME, FROM_EMAIL))
        msg['To'] = recipient_email
        if cc_recipients:
            msg['Cc'] = cc_email

        recipients = [recipient_email] + cc_recipients

        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        attachment = MIMEApplication(pdf_data, _subtype='pdf')
        attachment.add_header('Content-Disposition', 'attachment', filename=filename)
        msg.attach(attachment)

        server = _create_connection()
        server.sendmail(FROM_EMAIL, recipients, msg.as_string())
        server.quit()

        log_id = _log_pdf_send(
            customer_key,
            employee_name, document_type, recipient_email,
            cc_email if cc_recipients else '', filename,
            week_number, week_year, params.get('recipient_whatsapp', '')
        )

        return {
            'success': True,
            'data': {
                'log_id': log_id,
                'status': 'sent',
            }
        }
    except Exception as e:
        return {'success': False, 'error': f'Email could not be sent: {str(e)}'}


def _generate_email_content(doc_type, employee_name, week_number, week_year,
                             date_range, total_hours, amount) -> tuple:
    """Generiert Betreff + Body – identisch zu PHP generateEmailContent()."""
    if doc_type == 'timesheet':
        subject = f'Stundennachweis - {employee_name}'
        body = f'Anbei der Stundennachweis von {employee_name}'
        if week_number and week_year:
            body += f' für KW {week_number}/{week_year}'
        if date_range:
            body += f' ({date_range})'
        if total_hours:
            body += f'\n\nGesamtstunden: {total_hours}'
    elif doc_type == 'sick_leave':
        subject = f'Krankmeldung - {employee_name}'
        body = f'Anbei die Krankmeldung von {employee_name}'
        if date_range:
            body += f' ({date_range})'
    elif doc_type == 'vacation':
        subject = f'Urlaubsantrag - {employee_name}'
        body = f'Anbei der Urlaubsantrag von {employee_name}'
        if date_range:
            body += f' ({date_range})'
    elif doc_type == 'advance_payment':
        subject = f'Vorschussantrag - {employee_name}'
        body = f'Anbei der Vorschussantrag von {employee_name}'
        if date_range:
            body += f' vom {date_range}'
        if amount:
            body += f'\n\nAngeforderter Betrag: {amount} €'
    else:
        subject = f'Dokument - {employee_name}'
        body = f'Anbei ein Dokument von {employee_name}'

    body += '\n\nMit freundlichen Grüßen\nIhr Mitarbeiter Pro System'
    return subject, body


def _log_pdf_send(customer_key, employee_name, document_type, recipient_email, cc_email,
                   filename, week_number, week_year, whatsapp) -> int:
    try:
        from api.models import PdfLog
        combined_email = recipient_email
        if cc_email:
            combined_email += f'; {cc_email} (CC)'
        log = PdfLog.objects.create(
            customer_key=customer_key or 'default',
            employee_name=employee_name,
            document_type=document_type,
            recipient_email=combined_email,
            recipient_whatsapp=whatsapp or '',
            filename=filename,
            week_number=week_number or None,
            week_year=week_year or None,
            status='sent',
        )
        return log.id
    except Exception:
        return 0
