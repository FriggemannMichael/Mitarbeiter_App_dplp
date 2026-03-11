import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv('.env.app', interpolate=False)
load_dotenv(interpolate=False)  # Fallback auf .env

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'mitarbeiterapp.urls'
WSGI_APPLICATION = 'mitarbeiterapp.wsgi.application'

# Datenbank
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'mitarbeiterapp'),
        'USER': os.environ.get('DB_USER', 'mitarbeiter'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'db'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# CORS – wichtig: credentials: "include" erfordert explizite Origins, kein Wildcard
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
    if o.strip()
]
# Im Dev-Modus alle localhost-Ports erlauben (Vite wechselt Port wenn 5173 belegt)
if DEBUG:
    CORS_ALLOWED_ORIGIN_REGEXES = [r'^http://localhost:\d+$']
CORS_ALLOW_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
CORS_ALLOW_HEADERS = ['content-type', 'authorization', 'x-api-key']

# REST Framework – kein eingebautes Auth, wir machen JWT-Cookie selbst
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
}

# Statische Dateien
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {'context_processors': []},
    },
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Cache (für Rate-Limiting – locmem ist thread-safe)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Spam-Schutz
PDF_RATE_LIMIT = int(os.environ.get('PDF_RATE_LIMIT', '10'))  # max. Requests/Minute pro IP
PDF_API_SECRET = os.environ.get('PDF_API_SECRET', '')         # Shared Secret (leer = deaktiviert)
LANGUAGE_CODE = 'de-de'
TIME_ZONE = 'Europe/Berlin'
USE_TZ = True
