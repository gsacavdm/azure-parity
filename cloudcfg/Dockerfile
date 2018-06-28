FROM microsoft/dotnet:sdk
COPY /cloudcfg/cloudcfg.csproj /app/cloudcfg/
COPY /shared/shared.csproj /app/shared/

WORKDIR /app/cloudcfg

RUN dotnet restore

COPY /cloudcfg/ /app/cloudcfg
COPY /shared/ /app/shared/

RUN dotnet publish -c Release -r alpine-x64 -o bin/out

FROM microsoft/dotnet:2.1-runtime-deps-alpine
LABEL AUTHOR=gsacavdm

COPY --from=0 /app/cloudcfg/bin/out /app

WORKDIR /app
ENTRYPOINT [ "/app/cloudcfg"]