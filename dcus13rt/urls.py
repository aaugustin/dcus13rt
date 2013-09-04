from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from connect4.urls import urlpatterns as connect4_urlpatterns
from demo.urls import urlpatterns as demo_urlpatterns


urlpatterns = sum((
    connect4_urlpatterns,
    demo_urlpatterns,
    # Serve static files when running on c10ktools' runserver or gunicorn.
    staticfiles_urlpatterns(),
), [])
