from django.views.generic import TemplateView

from .websockets import PLAYERS, GAMES


class WebsocketsDebugView(TemplateView):

    template_name = 'connect4/websockets_debug.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            'players': sorted(PLAYERS.items()),
            'games': sorted(GAMES.items()),
        })
        return context
