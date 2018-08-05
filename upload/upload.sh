#!/bin/sh
SLEEP_DURATION=10m

while [ 1 ]
do
  DATABASE=azure-parity
  
  # Derive the collection from the filename assuming the pattern 'collectionname_CLOUD', e.g. policy_Bf
  # We're splitting the output from find on both _ and taking the first element.
  COLLECTION=$(find *.json -type f | head -n 1 | awk -F '_' '{print $1}')Raw

  echo "$(date +%Y%m%d_%H%M%S): Upload. HOSTNAME=$HOSTNAME DATABASE=$DATABASE"
  if [ ! -e upload_checkpoint ]; then
    # if no checkpoint, process json files.
    find *.json -exec mongoimport --host $HOSTNAME -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates -d $DATABASE -c $COLLECTION --file {} \;
  else
    # if there is a checkpoint, get files created after that checkpoint.
    find *.json -newer upload_checkpoint -exec mongoimport --host $HOSTNAME -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates -d $DATABASE -c $COLLECTION --file {} \;
  fi
  echo "$(date +%Y%m%d_%H%M%S): Upload complete. HOSTNAME=$HOSTNAME DATABASE=$DATABASE"
  echo "$(date +%Y%m%d_%H%M%S): Sleep. SLEEP_DURATION=$SLEEP_DURATION"
  echo "" > upload_checkpoint
  sleep $SLEEP_DURATION
 done
