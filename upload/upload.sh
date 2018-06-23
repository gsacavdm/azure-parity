#!/bin/sh
SLEEP_DURATION=10m

while [ 1 ]
do
  DATABASE=azure-parity-$(date +%Y%m%d)
  echo "Uploading to $HOSTNAME in DB $DATABASE"
  find *.json -newer upload_checkpoint -exec mongoimport --host $HOSTNAME -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates -d $DATABASE --file {} \;
  echo "" > upload_checkpoint
  sleep $SLEEP_DURATION
 done
