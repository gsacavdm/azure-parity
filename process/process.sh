#!/bin/sh
SLEEP_DURATION=1h

while [ 1 ]
do
  DATABASE=azure-parity-$(date +%Y%m%d)
  echo "Processing HostName=$HOSTNAME DB=$DATABASE File=$FILE"
  mongo $HOSTNAME/$DATABASE -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates utils.js $FILE
  sleep $SLEEP_DURATION
done