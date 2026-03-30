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


def _format_smtp_error(exc: Exception) -> str:
    """Liefert lesbare SMTP-Fehler mit konkreten Hinweisen fuer bekannte Provider."""
    raw_error = str(exc)

    if '5.7.139' in raw_error and 'SmtpClientAuthentication is disabled for the Tenant' in raw_error:
        return (
            'SMTP-Authentifizierung bei Microsoft 365 ist fuer diesen Tenant deaktiviert '
            '(Fehler 5.7.139). Bitte SMTP AUTH fuer den Tenant oder das betroffene '
            'Postfach aktivieren oder auf einen anderen Mailversand umstellen.'
        )

    if 'Authentication unsuccessful' in raw_error:
        return f'Authentifizierung am SMTP-Server fehlgeschlagen: {raw_error}'

    return raw_error


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


def _build_pdf_message(
    subject: str,
    body: str,
    to_email: str,
    filename: str,
    pdf_data: bytes,
    cc_recipients: list[str] | None = None,
):
    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['From'] = formataddr((FROM_NAME, FROM_EMAIL))
    msg['To'] = to_email
    if cc_recipients:
        msg['Cc'] = ', '.join(cc_recipients)

    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    attachment = MIMEApplication(pdf_data, _subtype='pdf')
    attachment.add_header('Content-Disposition', 'attachment', filename=filename)
    msg.attach(attachment)
    return msg


def _send_pdf_via_smtp(
    subject: str,
    body: str,
    to_email: str,
    filename: str,
    pdf_data: bytes,
    cc_recipients: list[str] | None = None,
):
    recipients = [to_email] + (cc_recipients or [])
    msg = _build_pdf_message(
        subject=subject,
        body=body,
        to_email=to_email,
        filename=filename,
        pdf_data=pdf_data,
        cc_recipients=cc_recipients,
    )

    server = _create_connection()
    try:
        server.sendmail(FROM_EMAIL, recipients, msg.as_string())
    finally:
        server.quit()


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
        return {'success': False, 'error': f'SMTP-Fehler: {_format_smtp_error(e)}'}


def send_pdf(params: dict) -> dict:
    """
    Sendet PDF per Email – identisch zu PHP EmailService.sendPdf().
    Dual-Email: recipient_email + optional customer_email.
    Loggt in pdf_logs Tabelle.
    """
    try:
        pdf_base64 = params.get('pdf_base64', '')
        recipient_email = params.get('recipient_email', '')
        customer_email = params.get('customer_email', '').strip()
        document_type = params.get('document_type', 'timesheet')
        employee_name = params.get('employee_name', 'Mitarbeiter')
        filename = params.get('filename', 'dokument.pdf')
        week_number = params.get('week_number', '')
        week_year = params.get('week_year', '')
        date_range = params.get('date_range', '')
        total_hours = params.get('total_hours', '')
        amount = params.get('amount', '')

        pdf_data = base64.b64decode(pdf_base64)

        customer_key = params.get('customer_key', 'default') or 'default'

        from api.services.config_service import load_config
        db_config = load_config(customer_key=customer_key) or {}
        cc_email = (
            db_config.get('technical', {}).get('pdf_review_cc_email', '').strip()
            or db_config.get('company', {}).get('default_email', '').strip()
        )

        subject, body = _generate_email_content(
            document_type, employee_name, week_number, week_year,
            date_range, total_hours, amount, admin_email=cc_email
        )

        cc_recipients = []
        if document_type == 'timesheet' and cc_email and _EMAIL_RE.match(cc_email):
            cc_recipients.append(cc_email)

        should_send_customer_copy = (
            document_type == 'timesheet'
            and customer_email
            and _EMAIL_RE.match(customer_email)
            and customer_email.lower() != recipient_email.lower()
        )
        customer_email_sent = False
        customer_email_error = ''

        if _should_simulate_email_send():
            print(
                "[email_service] Simulierter E-Mail-Versand aktiv "
                f"(doc={document_type}, to={recipient_email}, file={filename})"
            )
            customer_email_sent = should_send_customer_copy
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
                    'customer_email': customer_email if should_send_customer_copy else '',
                    'customer_email_sent': customer_email_sent,
                    'customer_email_error': customer_email_error,
                }
            }

        _send_pdf_via_smtp(
            subject=subject,
            body=body,
            to_email=recipient_email,
            filename=filename,
            pdf_data=pdf_data,
            cc_recipients=cc_recipients,
        )

        if should_send_customer_copy:
            customer_subject = f'Kopie: {subject}'
            customer_body = (
                f'Sie erhalten eine Kopie des Dokuments von {employee_name}.\n\n'
                f'{body}'
            )
            try:
                _send_pdf_via_smtp(
                    subject=customer_subject,
                    body=customer_body,
                    to_email=customer_email,
                    filename=filename,
                    pdf_data=pdf_data,
                )
                customer_email_sent = True
            except Exception as customer_exc:
                customer_email_error = str(customer_exc)

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
                'customer_email': customer_email if should_send_customer_copy else '',
                'customer_email_sent': customer_email_sent,
                'customer_email_error': customer_email_error,
            }
        }
    except Exception as e:
        return {'success': False, 'error': f'Email could not be sent: {_format_smtp_error(e)}'}


def _generate_email_content(doc_type, employee_name, week_number, week_year,
                             date_range, total_hours, amount, admin_email='') -> tuple:
    """Generiert Betreff + Body."""
    if doc_type == 'timesheet':
        subject = f'Stundennachweis KW {week_number}/{week_year} – {employee_name}' if week_number and week_year else f'Stundennachweis – {employee_name}'
        body = f'Sehr geehrte Damen und Herren,\n\n'
        body += f'anbei erhalten Sie den Stundennachweis von {employee_name}'
        if week_number and week_year:
            body += f' für KW {week_number}/{week_year}'
        if date_range:
            body += f' ({date_range})'
        body += '.'
        if total_hours:
            body += f'\n\nGesamtstunden: {total_hours}'
        body += '\n\nWir bitten Sie, den beigefügten Stundennachweis zu prüfen und durch Ihre Unterschrift zu bestätigen.'
        if admin_email:
            body += f' Bitte leiten Sie das unterschriebene Dokument anschließend an {admin_email} weiter.'
        else:
            body += ' Bitte leiten Sie das unterschriebene Dokument anschließend an die Administration weiter.'
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
