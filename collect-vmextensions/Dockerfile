FROM microsoft/dotnet:sdk
COPY /collect-vmextensions/collect-vmextensions.csproj /app/collect-vmextensions/
COPY /shared/shared.csproj /app/shared/

WORKDIR /app/collect-vmextensions

RUN dotnet restore

COPY /collect-vmextensions/ /app/collect-vmextensions
COPY /shared/ /app/shared/

RUN dotnet publish -c Release -r alpine-x64 -o bin/out

FROM microsoft/dotnet:2.1-runtime-deps-alpine
LABEL AUTHOR=gsacavdm

COPY --from=0 /app/collect-vmextensions/bin/out /app

WORKDIR /app
ENTRYPOINT [ "/app/collect-vmextensions"]