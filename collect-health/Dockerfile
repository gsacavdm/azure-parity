FROM microsoft/dotnet:sdk
COPY /collect-health/collect-health.csproj /app/collect-health/
COPY /shared/shared.csproj /app/shared/

WORKDIR /app/collect-health

RUN dotnet restore

COPY /collect-health/ /app/collect-health
COPY /shared/ /app/shared/

RUN dotnet publish -c Release -r alpine-x64 -o bin/out

FROM microsoft/dotnet:2.1-runtime-deps-alpine
LABEL AUTHOR=gsacavdm

COPY --from=0 /app/collect-health/bin/out /app

WORKDIR /app
ENTRYPOINT [ "/app/collect-health"]