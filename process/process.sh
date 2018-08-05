#!/bin/sh
SLEEP_DURATION=1h

while [ 1 ]
do
  DATABASE=azure-parity
  echo "$(date +%Y%m%d_%H%M%S): Process. HostName=$HOSTNAME DB=$DATABASE File=$FILE"
  mongo $HOSTNAME/$DATABASE -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates utils.js $FILE
  echo "$(date +%Y%m%d_%H%M%S): Process Complete. HostName=$HOSTNAME DB=$DATABASE File=$FILE"
  echo "$(date +%Y%m%d_%H%M%S): Sleep. SLEEP_DURATION=$SLEEP_DURATION"
  sleep $SLEEP_DURATION
done