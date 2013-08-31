#!/usr/bin/env python

import sys

from demo.models import send_message


message = " ".join(sys.argv[1:])
num = send_message(message)

if num == 1:
    log = "Sent to one subscriber"
else:
    log = "Sent to {} subscribers".format(num)
print("{}: {}".format(log, message))
