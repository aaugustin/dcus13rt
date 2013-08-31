from django.http import HttpResponse

from demo.models import recv_message


def long_polling_endpoint(request):
    message = recv_message()
    return HttpResponse(message.encode('utf-8'),
            content_type='text/plain; charset=utf-8')
