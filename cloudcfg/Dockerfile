FROM microsoft/dotnet:sdk
COPY . /app

WORKDIR /app/cloudcfg

RUN dotnet restore \
  && dotnet publish -c Release -r alpine-x64 -o bin/out

FROM microsoft/dotnet:2.1-runtime-deps-alpine
LABEL AUTHOR=gsacavdm

COPY --from=0 /app/cloudcfg/bin/out /app

WORKDIR /app
ENTRYPOINT [ "/app/cloudcfg"]