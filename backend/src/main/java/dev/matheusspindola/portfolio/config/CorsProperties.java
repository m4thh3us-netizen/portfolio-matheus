package dev.matheusspindola.portfolio.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Allowed CORS origins, bound from {@code app.cors.allowed-origins}
 * (env {@code APP_CORS_ALLOWED_ORIGINS}, comma-separated).
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        allowedOrigins = allowedOrigins == null
                ? List.of()
                : allowedOrigins.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
