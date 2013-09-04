from django.conf import settings
from django.conf.urls import patterns, url
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from connect4.urls import urlpatterns as connect4_urlpatterns
from demo.urls import urlpatterns as demo_urlpatterns


staticfiles_urlpatterns2 = patterns('',
    url(r'^static/(?P<path>.*)$',
        'django.views.static.serve',
        {'document_root' : settings.STATIC_ROOT})
)

urlpatterns = sum((
    connect4_urlpatterns,
    demo_urlpatterns,
    # Serve static files when running on c10ktools' runserver or gunicorn.
    # Requires collectstatic when DEBUG is False.
    staticfiles_urlpatterns() if settings.DEBUG else staticfiles_urlpatterns2,
), [])
