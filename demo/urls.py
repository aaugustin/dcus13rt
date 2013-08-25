from django.conf.urls import patterns, url
from django.views.generic import TemplateView

from . import views


urlpatterns = patterns('',
    url(r'^long_polling/$', TemplateView.as_view(template_name='demo/long_polling.html')),
    url(r'^long_polling/endpoint/$', views.long_polling_endpoint),
)
