#!/bin/sh

DATABASE=$(date +%Y%m%d-%H%M%S)

#while [ 1 ]
#do
echo "Uploading to $HOSTNAME in DB $DATABASE"
find *.json -exec mongoimport --host $HOSTNAME -u $USERNAME -p $PASSWORD --ssl --sslAllowInvalidCertificates -d $DATABASE --file {} \;
#  sleep 1d
#done