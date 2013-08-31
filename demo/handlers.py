import tulip
import websockets

from demo.models import recv_message


@tulip.coroutine
def simple_endpoint(websocket, uri):
    # Doesn't work! recv_message isn't a coroutine.
    message = yield from recv_message()
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
        message = recv_message()
        for websocket in subscribers:
            if websocket.open:
                websocket.send(message)


if __name__ == '__main__':
    websockets.serve(endpoint, 'localhost', 7999)
    loop = tulip.get_event_loop()
    loop.run_in_executor(None, relay_messages)
    loop.run_forever()

