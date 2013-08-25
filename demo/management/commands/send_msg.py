import redis

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    args = "<message>"
    help = "Sends a message to subscribers"

    def handle(self, *args, **options):
        redis_client = redis.StrictRedis()
        message = " ".join(args)
        num = redis_client.publish('demo', message.encode('utf-8'))
        subs = "one subscriber" if num == 1 else "{} subscribers".format(num)
        self.stdout.write("Sent to {}: {}\n".format(subs, message))
