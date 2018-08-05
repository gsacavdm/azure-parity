#!/bin/sh
SLEEP_DURATION=10m

while [ 1 ]
do
  DATABASE=azure-parity-$(date +%Y%m%d)
  echo "$(date +%Y%m%d_%H%M%S): Upload. HOSTNAME=$HOSTNAME DATABASE=$DATABASE"
  if [ ! -e upload_checkpoint ]; then
    # if no checkpoint, process json files.
    find *.json -exec mongoimport --host $HOSTNAME -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates -d $DATABASE --file {} \;
  else
    # if there is a checkpoint, get files created after that checkpoint.
    find *.json -newer upload_checkpoint -exec mongoimport --host $HOSTNAME -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates -d $DATABASE --file {} \;
  fi
  echo "$(date +%Y%m%d_%H%M%S): Upload complete. HOSTNAME=$HOSTNAME DATABASE=$DATABASE"
  echo "$(date +%Y%m%d_%H%M%S): Sleep. SLEEP_DURATION=$SLEEP_DURATION"
  echo "" > upload_checkpoint
  sleep $SLEEP_DURATION
 done
