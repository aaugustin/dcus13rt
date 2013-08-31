import redis


CHANNEL = 'demo'


def send_message(message):
    client = redis.StrictRedis()
    message = message.encode('utf-8')
    return client.publish(CHANNEL, message)


def recv_message():
    client = redis.StrictRedis()
    pubsub = client.pubsub()

    pubsub.subscribe(CHANNEL)
    for event in pubsub.listen():
        if event['type'] == 'message':
            message = event['data'].decode('utf-8')
            break
    pubsub.unsubscribe()

    return message
