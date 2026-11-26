# syntax=docker/dockerfile:1

# Base images are pinned to exact versions (bump deliberately, e.g. via Dependabot/Renovate).
# For full reproducibility, append the digest: eclipse-temurin:21.0.8_9-jre@sha256:<digest>

# ---- build stage ----
FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package \
 && java -Djarmode=tools -jar target/portfolio-api.jar extract --layers --launcher --destination extracted

# ---- runtime stage ----
FROM eclipse-temurin:21.0.8_9-jre
RUN groupadd --system app && useradd --system --gid app --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
# Layers ordered from least to most frequently changed: a code change only re-ships the small application layer.
COPY --from=build --chown=app:app /workspace/extracted/dependencies/ ./
COPY --from=build --chown=app:app /workspace/extracted/spring-boot-loader/ ./
COPY --from=build --chown=app:app /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=app:app /workspace/extracted/application/ ./
USER app
# Footprint tuned for 256-512 MB free-tier containers.
ENV PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -XX:+UseSerialGC -Xss512k"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
