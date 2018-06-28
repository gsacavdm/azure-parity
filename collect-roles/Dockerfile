FROM microsoft/dotnet:sdk
COPY /collect-roles/collect-roles.csproj /app/collect-roles/
COPY /shared/shared.csproj /app/shared/

WORKDIR /app/collect-roles

RUN dotnet restore

COPY /collect-roles/ /app/collect-roles
COPY /shared/ /app/shared/

RUN dotnet publish -c Release -r alpine-x64 -o bin/out

FROM microsoft/dotnet:2.1-runtime-deps-alpine
LABEL AUTHOR=gsacavdm

COPY --from=0 /app/collect-roles/bin/out /app

WORKDIR /app
ENTRYPOINT [ "/app/collect-roles"]