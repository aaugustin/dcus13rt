import tulip
import websockets

from demo.models import get_next_message


@tulip.coroutine
def simple_endpoint(websocket, uri):
    # Doesn't work! get_next_message isn't a coroutine.
    message = yield from get_next_message()
    websocket.send(message)


subscribers = set()


@tulip.coroutine
def endpoint(websocket, uri):
    global subscribers
    subscribers.add(websocket)
    yield from websocket.recv()
    subscribers.remove(websocket)


def relay_messages():
    while True:
        message = get_next_message()
        for websocket in subscribers:
            if websocket.open:
                websocket.send(message)


if __name__ == '__main__':
    websockets.serve(endpoint, 'localhost', 7999)
    loop = tulip.get_event_loop()
    loop.run_in_executor(None, relay_messages)
    loop.run_forever()

