#!/bin/sh

while [ 1 ]
do
  DATABASE=azure-parity-$(date +%Y%m%d)
  echo "Uploading to $HOSTNAME in DB $DATABASE"
  find *.json -exec mongoimport --host $HOSTNAME -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates -d $DATABASE --file {} \;
  sleep 1d
done