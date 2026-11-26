package dev.matheusspindola.portfolio.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * QA-03 against a real Tomcat: hardening headers on success, error (404, 413, 429, CORS 403) and contact responses;
 * Swagger UI / OpenAPI docs are excluded from the restrictive CSP and still load.
 * {@code max-requests=2} gives this class its own context (and rate limiter), isolated from other tests.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.contact.rate-limit.max-requests=2")
class SecurityHeadersTest {

    private static final String CSP = "default-src 'none'; frame-ancestors 'none'";

    @LocalServerPort
    int port;

    private final HttpClient client = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private HttpResponse<String> get(String path) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(10)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> postContact(String body) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/contact"))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .header("Origin", "http://localhost:3000")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build(), HttpResponse.BodyHandlers.ofString());
    }

    private static void assertBaseHeaders(HttpResponse<?> response) {
        assertThat(response.headers().firstValue("X-Content-Type-Options")).hasValue("nosniff");
        assertThat(response.headers().firstValue("Referrer-Policy")).hasValue("no-referrer");
        assertThat(response.headers().firstValue("X-Frame-Options")).hasValue("DENY");
    }

    private static void assertApiHeaders(HttpResponse<?> response) {
        assertBaseHeaders(response);
        assertThat(response.headers().firstValue("Content-Security-Policy")).hasValue(CSP);
    }

    @Test
    void healthOkHasHeaders() throws Exception {
        HttpResponse<String> response = get("/api/health");
        assertThat(response.statusCode()).isEqualTo(200);
        assertApiHeaders(response);
        assertThat(response.headers().firstValue("Cache-Control")).isEmpty();
    }

    @Test
    void projectsOkHasHeaders() throws Exception {
        HttpResponse<String> response = get("/api/projects");
        assertThat(response.statusCode()).isEqualTo(200);
        assertApiHeaders(response);
    }

    @Test
    void unknownProject404HasHeaders() throws Exception {
        HttpResponse<String> response = get("/api/projects/nope");
        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(response.headers().firstValue("Content-Type"))
                .hasValueSatisfying(v -> assertThat(v).startsWith("application/problem+json"));
        assertApiHeaders(response);
    }

    @Test
    void unknownRoute404HasHeaders() throws Exception {
        HttpResponse<String> response = get("/api/does-not-exist");
        assertThat(response.statusCode()).isEqualTo(404);
        assertApiHeaders(response);
    }

    @Test
    void oversizedBody413HasHeadersAndNoStore() throws Exception {
        String body = "{\"name\":\"Ana Souza\",\"email\":\"ana@example.com\",\"message\":\""
                + "x".repeat(20_000) + "\",\"startedAt\":1}";
        HttpResponse<String> response = postContact(body);
        assertThat(response.statusCode()).isEqualTo(413);
        assertApiHeaders(response);
        assertThat(response.headers().firstValue("Cache-Control")).hasValue("no-store");
        assertThat(response.headers().firstValue("Access-Control-Allow-Origin")).hasValue("http://localhost:3000");
    }

    @Test
    void corsRejection403HasHeaders() throws Exception {
        HttpResponse<String> response = client.send(HttpRequest.newBuilder(
                        URI.create("http://127.0.0.1:" + port + "/api/projects"))
                .header("Origin", "https://evil.example").GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(403);
        assertApiHeaders(response);
    }

    /** One method so the order 202 → 400 → 429 is deterministic against the per-class limit of 2. */
    @Test
    void contactResponsesAreNoStoreIncluding429() throws Exception {
        String valid = """
                {"name":"Ana Souza","email":"ana@example.com","subject":"Oi",
                 "message":"Olá Matheus, gostaria de conversar.","website":"","startedAt":%d}
                """.formatted(System.currentTimeMillis() - 10_000);

        HttpResponse<String> accepted = postContact(valid);
        assertThat(accepted.statusCode()).isEqualTo(202);
        assertApiHeaders(accepted);
        assertThat(accepted.headers().firstValue("Cache-Control")).hasValue("no-store");

        HttpResponse<String> invalid = postContact("{}");
        assertThat(invalid.statusCode()).isEqualTo(400);
        assertApiHeaders(invalid);
        assertThat(invalid.headers().firstValue("Cache-Control")).hasValue("no-store");

        HttpResponse<String> limited = postContact(valid);
        assertThat(limited.statusCode()).isEqualTo(429);
        assertApiHeaders(limited);
        assertThat(limited.headers().firstValue("Cache-Control")).hasValue("no-store");
        assertThat(limited.headers().firstValue("Retry-After")).isPresent();
    }

    @Test
    void swaggerUiIsExcludedFromCspAndLoads() throws Exception {
        HttpResponse<String> index = get("/swagger-ui/index.html");
        assertThat(index.statusCode()).isEqualTo(200);
        assertThat(index.headers().firstValue("Content-Security-Policy")).isEmpty();
        assertBaseHeaders(index);
        assertThat(index.body()).contains("swagger-ui-bundle.js").contains("swagger-ui.css");

        for (String asset : new String[] {"/swagger-ui/swagger-ui-bundle.js", "/swagger-ui/swagger-ui.css",
                "/swagger-ui/swagger-initializer.js", "/swagger-ui/swagger-ui-standalone-preset.js"}) {
            HttpResponse<String> response = get(asset);
            assertThat(response.statusCode()).as(asset).isEqualTo(200);
            assertThat(response.headers().firstValue("Content-Security-Policy")).as(asset).isEmpty();
        }

        HttpResponse<String> redirect = get("/swagger-ui.html");
        assertThat(redirect.statusCode()).isEqualTo(302);
        assertThat(redirect.headers().firstValue("Content-Security-Policy")).isEmpty();
    }

    @Test
    void openApiDocsAreExcludedFromCsp() throws Exception {
        HttpResponse<String> docs = get("/v3/api-docs");
        assertThat(docs.statusCode()).isEqualTo(200);
        assertThat(docs.headers().firstValue("Content-Security-Policy")).isEmpty();
        assertBaseHeaders(docs);

        HttpResponse<String> config = get("/v3/api-docs/swagger-config");
        assertThat(config.statusCode()).isEqualTo(200);
        assertThat(config.headers().firstValue("Content-Security-Policy")).isEmpty();
    }

    @Test
    void documentationPathMatcher() {
        assertThat(SecurityHeadersFilter.isDocumentationPath("/swagger-ui/index.html")).isTrue();
        assertThat(SecurityHeadersFilter.isDocumentationPath("/swagger-ui.html")).isTrue();
        assertThat(SecurityHeadersFilter.isDocumentationPath("/v3/api-docs")).isTrue();
        assertThat(SecurityHeadersFilter.isDocumentationPath("/v3/api-docs/swagger-config")).isTrue();
        assertThat(SecurityHeadersFilter.isDocumentationPath("/v3/api-docs.yaml")).isTrue();
        assertThat(SecurityHeadersFilter.isDocumentationPath("/swagger-uix")).isFalse();
        assertThat(SecurityHeadersFilter.isDocumentationPath("/api/projects")).isFalse();
        assertThat(SecurityHeadersFilter.isDocumentationPath("/v3/api-docsx")).isFalse();
    }
}
