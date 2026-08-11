import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.monitoring.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    # HTTP requests handled by Django as normal
    'http': django_asgi_app,

    # WebSocket connections routed to our consumers
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})