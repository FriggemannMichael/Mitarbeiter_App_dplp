import json

import bcrypt
from django.test import TestCase, Client

from api.models import Account
from api.services.email_service import _generate_customer_timesheet_email, send_pdf


class AccountAuthApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.customer_key = 'tenant-a'
        self.password = 'StrongPass123!'
        self.account = Account.objects.create(
            customer_key=self.customer_key,
            username='admin',
            email='admin@example.com',
            password_hash=bcrypt.hashpw(self.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            role='customer_admin',
            is_active=True,
        )

    def _login(self):
        return self.client.post(
            '/auth/login',
            data=json.dumps({
                'username': 'admin',
                'password': self.password,
                'customerKey': self.customer_key,
            }),
            content_type='application/json',
            HTTP_X_CUSTOMER_KEY=self.customer_key,
        )

    def test_login_with_account_returns_role_and_account_id(self):
        response = self._login()
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload['success'])
        self.assertEqual(payload['data']['account_id'], self.account.id)
        self.assertEqual(payload['data']['role'], 'customer_admin')
        self.assertEqual(payload['data']['customer_key'], self.customer_key)

    def test_account_management_requires_customer_admin_role(self):
        login_response = self._login()
        self.assertEqual(login_response.status_code, 200)

        list_response = self.client.get('/api/accounts', HTTP_X_CUSTOMER_KEY=self.customer_key)
        self.assertEqual(list_response.status_code, 200)
        data = list_response.json()['data']
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['username'], 'admin')

    def test_create_account(self):
        login_response = self._login()
        self.assertEqual(login_response.status_code, 200)

        response = self.client.post(
            '/api/accounts/create',
            data=json.dumps({
                'username': 'dispatcher1',
                'password': 'StrongPass123!',
                'role': 'dispatcher',
                'email': 'dispatcher@example.com',
                'is_active': True,
                'customerKey': self.customer_key,
            }),
            content_type='application/json',
            HTTP_X_CUSTOMER_KEY=self.customer_key,
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Account.objects.filter(customer_key=self.customer_key, username='dispatcher1').exists())


class EmailTemplateTests(TestCase):
    def test_customer_timesheet_email_without_supervisor_signature_requests_forwarding(self):
        subject, body = _generate_customer_timesheet_email(
            employee_name='Michael Friggemann',
            week_number='18',
            week_year='2026',
            date_range='27.04.2026 - 03.05.2026',
            admin_email='office@example.com',
            has_supervisor_signature=False,
        )

        self.assertEqual(
            subject,
            'Stundennachweis KW 18/2026 - Michael Friggemann',
        )
        self.assertIn(
            'Bitte bestaetigen Sie die geleisteten Stunden',
            body,
        )
        self.assertIn(
            'per Email an office@example.com weiterleiten.',
            body,
        )
        self.assertNotIn('Gesamtstunden:', body)
        self.assertNotIn('Ihr Mitarbeiter Pro System', body)

    def test_send_pdf_uses_customer_template_without_supervisor_signature(self):
        result = send_pdf({
            'pdf_base64': 'JVBERi0xLgo=',
            'recipient_email': 'kunde@example.com',
            'document_type': 'timesheet',
            'employee_name': 'Michael Friggemann',
            'filename': 'stundennachweis.pdf',
            'week_number': '18',
            'week_year': '2026',
            'date_range': '27.04.2026 - 03.05.2026',
            'total_hours': '02:45',
            'has_supervisor_signature': False,
            'is_customer_recipient': False,
            'customer_key': 'default',
        })

        self.assertTrue(result['success'])
        self.assertEqual(
            result['data']['subject'],
            'Stundennachweis KW 18/2026 - Michael Friggemann',
        )
        self.assertIn(
            'Bitte bestaetigen Sie die geleisteten Stunden',
            result['data']['body'],
        )
        self.assertNotIn('Gesamtstunden:', result['data']['body'])
