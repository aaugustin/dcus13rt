from django.conf.urls import patterns, url
from django.views.generic import TemplateView

try:
    from c10ktools.http import websocket            # use at your own risk!
except ImportError:
    websocket = None

from .views import WebsocketsDebugView
from .websockets import connect, play


urlpatterns = patterns('',
    url(r'^$', TemplateView.as_view(template_name='connect4/websockets.html')),
    url(r'^debug/$', WebsocketsDebugView.as_view()),
    url(r'^local/$', TemplateView.as_view(template_name='connect4/base.html')),
)

if websocket is not None:
    urlpatterns += patterns('',
        url(r'^connect/$', websocket(connect), name='websockets-connect'),
        url(r'^play/$', websocket(play), name='websockets-play'),
    )
