FROM microsoft/dotnet:sdk
COPY /collect-rps/collect-rps.csproj /app/collect-rps/
COPY /shared/shared.csproj /app/shared/

WORKDIR /app/collect-rps

RUN dotnet restore

COPY /collect-rps/ /app/collect-rps
COPY /shared/ /app/shared/

RUN dotnet publish -c Release -r alpine-x64 -o bin/out

FROM microsoft/dotnet:2.1-runtime-deps-alpine
LABEL AUTHOR=gsacavdm

COPY --from=0 /app/collect-rps/bin/out /app

WORKDIR /app
ENTRYPOINT [ "/app/collect-rps"]