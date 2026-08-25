"""
Base settings for Facility Intelligence platform.
Shared across all environments (local, production).
Environment-specific overrides go in local.py / production.py
"""

import os
from datetime import timedelta
from pathlib import Path
import environ

# ============================================================
# PATH CONFIGURATION
# ============================================================
# Build paths like: BASE_DIR / 'subdir'
# BASE_DIR points to the backend/ folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================
# django-environ reads from a .env file or real environment
# variables. This is how we keep secrets out of source code.
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)

# Read .env file if it exists (development only)
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# ============================================================
# SECURITY
# ============================================================
SECRET_KEY = env('DJANGO_SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

# ============================================================
# APPLICATION DEFINITION
# ============================================================
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'django_extensions',
    'django_celery_beat',
    'django_celery_results',
    'guardian',
    'channels',
]

LOCAL_APPS = [
    # Our domain apps — added here as we create them
    'apps.hierarchy',
    'apps.monitoring',
    'apps.alerts',
    'apps.ml',
    'apps.ingestion',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ============================================================
# MIDDLEWARE
# ============================================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',      # Must be high up
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ============================================================
# URL CONFIGURATION
# ============================================================
ROOT_URLCONF = 'config.urls'

# ============================================================
# TEMPLATES
# ============================================================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ============================================================
# ASGI / WSGI
# ============================================================
# We use ASGI because Django Channels (WebSockets) requires it
ASGI_APPLICATION = 'config.asgi.application'
WSGI_APPLICATION = 'config.wsgi.application'

# ============================================================
# DATABASE
# ============================================================
DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default='postgresql://fi_user:fi_password@localhost:5432/facility_intelligence'
    )
}

# ============================================================
# DJANGO CHANNELS (WebSockets)
# ============================================================
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [env('REDIS_URL', default='redis://localhost:6379/0')],
        },
    },
}

# ============================================================
# CACHE (Redis)
# ============================================================
# Used by cache_page on the public status view.
# Redis is already running for Celery and Channels —
# we use database 2 to keep cache separate from both.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/2'),
    }
}

# ============================================================
# CELERY (Background Jobs)
# ============================================================
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# ============================================================
# SIMPLE JWT
# ============================================================
# Made explicit rather than relying on simplejwt's library defaults
# (a 5-minute access token, no rotation) — that lifetime was so short
# that ordinary use of the dashboard hit it constantly, and since the
# frontend didn't yet use the refresh token to renew silently, every
# expiry bounced the user straight back to the login screen mid-session.
# The frontend now does refresh silently on a 401 (see api/client.js),
# so this is mainly about not making that happen every few minutes.
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    # Deliberately not rotating refresh tokens: rotation needs the
    # `token_blacklist` app (to invalidate the old one), which isn't
    # installed here, and turning ROTATE_REFRESH_TOKENS on without it
    # would break the refresh flow this is meant to fix. The refresh
    # token is long-lived and reused as-is instead.
}

# ============================================================
# AUTHENTICATION
# ============================================================
AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'guardian.backends.ObjectPermissionBackend',  # django-guardian
)

# ============================================================
# PASSWORD VALIDATION
# ============================================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ============================================================
# INTERNATIONALIZATION
# ============================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ============================================================
# STATIC FILES
# ============================================================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ============================================================
# DEFAULT PRIMARY KEY
# ============================================================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================
# CORS (Cross-Origin Resource Sharing)
# Allows React frontend to call Django API
# ============================================================
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=['http://localhost:3000', 'http://localhost:5173']
)

# ============================================================
# EMAIL
# ============================================================
EMAIL_BACKEND   = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST      = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT      = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS   = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER     = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = env('DEFAULT_FROM_EMAIL', default='argus@facility-intelligence.com')

