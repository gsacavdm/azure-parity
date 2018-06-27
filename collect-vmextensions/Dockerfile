FROM microsoft/dotnet:sdk
COPY . /app

WORKDIR /app/collect-vmextensions

RUN dotnet restore \
  && dotnet publish -c Release -r alpine-x64 -o bin/out

FROM microsoft/dotnet:2.1-runtime-deps-alpine
LABEL AUTHOR=gsacavdm

COPY --from=0 /app/collect-vmextensions/bin/out /app

WORKDIR /app
ENTRYPOINT [ "/app/collect-vmextensions"]