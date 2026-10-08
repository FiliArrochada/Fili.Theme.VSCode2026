# syntax=docker/dockerfile:1
# Build stage: restore and publish the web project.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG CONFIGURATION=Release
WORKDIR /src
COPY ["Fili.Langs.Web/Fili.Langs.Web.csproj", "Fili.Langs.Web/"]
RUN dotnet restore "Fili.Langs.Web/Fili.Langs.Web.csproj"
COPY . .
RUN dotnet publish Fili.Langs.Web -c $CONFIGURATION -o /app \
    && rm -rf /src/obj

FROM mcr.microsoft.com/dotnet/aspnet:10.0
ENV ASPNETCORE_URLS=http://+:8080 TZ="Europe/Lisbon"
EXPOSE 8080
COPY --from=build /app /app
HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
USER app
ENTRYPOINT ["dotnet", "/app/Fili.Langs.Web.dll"]
