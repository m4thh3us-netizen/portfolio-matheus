package dev.matheusspindola.portfolio.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * M4 (4) / A1 against a real Tomcat: a body without Content-Length ({@code Transfer-Encoding: chunked}) is still
 * limited to {@code app.max-body-bytes}, and the 413 carries CORS headers (B1). A small chunked body is replayed intact.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ChunkedBodyLimitTest {

    @LocalServerPort
    int port;

    private final HttpClient client = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /** {@code ofInputStream} has unknown length → the JDK client sends {@code Transfer-Encoding: chunked}. */
    private HttpResponse<String> postChunked(String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/contact"))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .header("Origin", "http://localhost:3000")
                .POST(HttpRequest.BodyPublishers.ofInputStream(
                        () -> new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8))))
                .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void chunkedBodyAbove16KbIs413WithCors() throws Exception {
        String body = "{\"name\":\"Ana Souza\",\"email\":\"ana@example.com\",\"message\":\""
                + "x".repeat(20_000) + "\",\"startedAt\":1}";
        HttpResponse<String> response = postChunked(body);

        assertThat(response.statusCode()).isEqualTo(413);
        assertThat(response.headers().firstValue("Content-Type")).hasValueSatisfying(v -> assertThat(v).startsWith("application/problem+json"));
        assertThat(response.body()).contains("\"title\":\"Payload too large\"");
        assertThat(response.headers().firstValue("Access-Control-Allow-Origin")).hasValue("http://localhost:3000");
    }

    @Test
    void smallChunkedBodyIsReplayedAndAccepted() throws Exception {
        String body = """
                {"name":"Ana Souza","email":"ana@example.com","subject":"Oi",
                 "message":"Olá Matheus, gostaria de conversar.","website":"","startedAt":%d}
                """.formatted(System.currentTimeMillis() - 10_000);
        HttpResponse<String> response = postChunked(body);

        assertThat(response.statusCode()).isEqualTo(202);
        assertThat(response.body()).contains("\"status\":\"RECEIVED\"");
    }
}
