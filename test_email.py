import os
import django
from dotenv import load_dotenv

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

try:
    send_mail(
        'Test Subject',
        'Test Message',
        settings.DEFAULT_FROM_EMAIL,
        ['varunagrahari0024@gmail.com'],
        fail_silently=False,
    )
    print("Email sent successfully!")
except Exception as e:
    print(f"Error sending email: {e}")
