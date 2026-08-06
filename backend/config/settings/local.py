"""
Local development settings.
Extends base.py with dev-specific configuration.
"""

from .base import *  # noqa

# ============================================================
# DEBUG — always True in local development
# ============================================================
DEBUG = True

# ============================================================
# ALLOWED HOSTS — permissive in development
# ============================================================
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# ============================================================
# DEBUG TOOLBAR
# ============================================================
INSTALLED_APPS += ['debug_toolbar']  # noqa: F405

MIDDLEWARE += [  # noqa: F405
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

INTERNAL_IPS = ['127.0.0.1']

# ============================================================
# LOGGING — verbose in development
# ============================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',  # Shows every SQL query in dev
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# ============================================================
# EMAIL — print to console in development (no real emails)
# ============================================================
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'