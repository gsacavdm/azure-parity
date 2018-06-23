#!/bin/sh
SLEEP_DURATION=10m

while [ 1 ]
do
  DATABASE=azure-parity-$(date +%Y%m%d)
  echo "Uploading to $HOSTNAME in DB $DATABASE"
  if [ ! -e upload_checkpoint ]; then
    # if no checkpoint, process json files.
    find *.json -exec mongoimport --host $HOSTNAME -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates -d $DATABASE --file {} \;
  else
    # if there is a checkpoint, get files created after that checkpoint.
    find *.json -newer upload_checkpoint -exec mongoimport --host $HOSTNAME -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates -d $DATABASE --file {} \;
  fi
  echo "" > upload_checkpoint
  sleep $SLEEP_DURATION
 done
