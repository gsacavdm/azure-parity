FROM microsoft/dotnet:sdk
COPY /collect-portalextensions/collect-portalextensions.csproj /app/collect-portalextensions/
COPY /shared/shared.csproj /app/shared/

WORKDIR /app/collect-portalextensions

RUN dotnet restore

COPY /collect-portalextensions/ /app/collect-portalextensions
COPY /shared/ /app/shared/

RUN dotnet publish -c Release -r alpine-x64 -o bin/out

FROM microsoft/dotnet:2.1-runtime-deps-alpine
LABEL AUTHOR=gsacavdm

COPY --from=0 /app/collect-portalextensions/bin/out /app

WORKDIR /app
ENTRYPOINT [ "/app/collect-portalextensions"]