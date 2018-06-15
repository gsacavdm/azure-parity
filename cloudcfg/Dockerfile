FROM microsoft/dotnet:sdk
COPY . /app

WORKDIR /app/cloudcfg
RUN dotnet restore

RUN dotnet publish -r linux-x64

FROM microsoft/dotnet:2.1-runtime
LABEL AUTHOR=gsacavdm

COPY --from=0 /app/cloudcfg/bin/Debug/netcoreapp2.1/linux-x64 /app

WORKDIR /app
ENTRYPOINT [ "sh"]