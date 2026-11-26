package dev.matheusspindola.portfolio.health;

import java.time.Clock;
import java.time.Instant;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.info.BuildProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lightweight liveness endpoint in the contract shape. Actuator's {@code /actuator/health} is also exposed.
 * Version comes from Maven build-info when available, otherwise from {@code app.version}.
 */
@RestController
@Tag(name = "Health")
public class HealthController {

    private final String service;
    private final String version;
    private final Clock clock;

    public HealthController(ObjectProvider<BuildProperties> buildProperties,
                            @Value("${app.name:portfolio-api}") String service,
                            @Value("${app.version:unknown}") String fallbackVersion,
                            Clock clock) {
        BuildProperties build = buildProperties.getIfAvailable();
        this.service = service;
        this.version = build != null && build.getVersion() != null ? build.getVersion() : fallbackVersion;
        this.clock = clock;
    }

    @GetMapping("/api/health")
    @Operation(summary = "Service health")
    public HealthResponse health() {
        return new HealthResponse("UP", service, version, Instant.now(clock));
    }
}
