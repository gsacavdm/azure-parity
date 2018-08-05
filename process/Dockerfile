FROM ubuntu:16.04
LABEL AUTHOR=gsacavdm

RUN apt-get update \
  && apt-get install apt-transport-https --yes \
  && apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5 \
  && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.6.list \
  && apt-get update \
  && apt-get install -y mongodb-org-shell --yes

COPY process /script

WORKDIR /script
ENTRYPOINT [ "/script/process.sh"] 
