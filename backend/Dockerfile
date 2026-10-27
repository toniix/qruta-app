# syntax=docker/dockerfile:1
#
# Production image for the RutasYa backend, sized for Cloud Run but usable on
# any container host. Build context is `backend/`:
#
#   docker build -t rutasya-api backend/
#
# Configuration never travels inside the image: it arrives as environment
# variables. `.dockerignore` keeps `.env` and `application-local.properties`
# out of the build context on purpose.

# ---- Build -------------------------------------------------------------------
# The wrapper is used instead of the image's Maven so the build uses the
# version the repository pins.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Dependencies resolve from pom.xml alone, so editing sources does not
# invalidate this layer and rebuilds stay fast.
COPY pom.xml ./
COPY .mvn/ .mvn/
COPY mvnw ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
# The suite needs a live PostgreSQL with PostGIS, so it runs in CI, not here.
# This still compiles every source file and repackages the executable jar.
RUN ./mvnw -B -q -Dmaven.test.skip=true package

# ---- Runtime -----------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy

# Unprivileged process: a compromised application must not own the container.
RUN groupadd --system app \
 && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app

WORKDIR /app
# Only the repackaged jar matches *.jar; Spring Boot leaves the pre-repackage
# copy as *.jar.original.
COPY --from=build --chown=app:app /build/target/*.jar app.jar

USER app
EXPOSE 8080

# Read the cgroup memory limit instead of pinning -Xmx: Cloud Run sizes memory
# per deployment and the same image must work at 512Mi and at 2Gi.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"

# This image is the production artifact. Defaulting the profile here means a
# forgotten SPRING_PROFILES_ACTIVE resolves to prod (validate + Flyway) instead
# of falling back to local, which runs ddl-auto=update against a real database.
ENV SPRING_PROFILES_ACTIVE=prod

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
