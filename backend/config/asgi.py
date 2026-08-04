"""
ASGI config for Facility Intelligence.
Handles both HTTP (Django) and WebSocket (Django Channels) connections.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    # WebSocket routing will be added in Week 2
    # 'websocket': AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
})