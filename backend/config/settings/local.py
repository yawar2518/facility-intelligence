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


def _show_debug_toolbar(request):
    """
    Same INTERNAL_IPS check debug-toolbar uses by default, plus an
    explicit exclusion for the public status page. That page is meant
    to be a plain, readable page for an external customer — it should
    never grow the debug toolbar's SQL-query panel at the bottom
    (which is what was happening: every page load pulled it in and it
    reads as the page endlessly scrolling).
    """
    if request.path.startswith('/public-status/'):
        return False
    return request.META.get('REMOTE_ADDR') in INTERNAL_IPS


DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': _show_debug_toolbar,
}

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
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'