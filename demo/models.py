import redis


def get_next_message():
    redis_pubsub = redis.StrictRedis().pubsub()
    redis_pubsub.subscribe('demo')

    # Block until a message is published
    for message in redis_pubsub.listen():
        if message['type'] == 'message':
            break

    redis_pubsub.unsubscribe()

    return message['data'].decode('utf-8')
