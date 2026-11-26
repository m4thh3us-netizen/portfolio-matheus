package dev.matheusspindola.portfolio.contact;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WebhookContactSinkTest {

    private WebhookTestServer server;

    @BeforeEach
    void start() throws Exception {
        server = new WebhookTestServer();
    }

    @AfterEach
    void stop() {
        server.close();
    }

    private static ContactMessage message() {
        return new ContactMessage(UUID.fromString("00000000-0000-0000-0000-000000000001"),
                Instant.parse("2026-11-19T20:00:00Z"), "Ana Souza", "ana@example.com", "Vaga", "Olá Matheus,\ntudo bem?");
    }

    @Test
    void postsJsonPayloadWithBearerToken() throws Exception {
        try (WebhookContactSink sink = new WebhookContactSink(server.uri("/hook"), "s3cr3t", Duration.ofSeconds(5))) {
            sink.deliver(message());
        }
        assertThat(server.received).hasSize(1);
        WebhookTestServer.Received req = server.received.get(0);
        assertThat(req.method()).isEqualTo("POST");
        assertThat(req.path()).isEqualTo("/hook");
        assertThat(req.contentType()).startsWith("application/json");
        assertThat(req.authorization()).isEqualTo("Bearer s3cr3t");

        JsonNode json = new ObjectMapper().readTree(req.body());
        assertThat(json.get("id").asText()).isEqualTo("00000000-0000-0000-0000-000000000001");
        assertThat(json.get("receivedAt").asText()).isEqualTo("2026-11-19T20:00:00Z");
        assertThat(json.get("name").asText()).isEqualTo("Ana Souza");
        assertThat(json.get("email").asText()).isEqualTo("ana@example.com");
        assertThat(json.get("subject").asText()).isEqualTo("Vaga");
        assertThat(json.get("message").asText()).isEqualTo("Olá Matheus,\ntudo bem?");
    }

    @Test
    void omitsAuthorizationWhenNoToken() {
        try (WebhookContactSink sink = new WebhookContactSink(server.uri("/hook"), null, Duration.ofSeconds(5))) {
            sink.deliver(message());
        }
        assertThat(server.received.get(0).authorization()).isNull();
    }

    @Test
    void non2xxAnswerFailsDelivery() {
        for (int status : new int[] {301, 400, 401, 500, 503}) {
            server.status = status;
            try (WebhookContactSink sink = new WebhookContactSink(server.uri("/hook"), null, Duration.ofSeconds(5))) {
                assertThatThrownBy(() -> sink.deliver(message()))
                        .as("status %d", status)
                        .isInstanceOf(ContactDeliveryException.class);
            }
        }
    }

    @Test
    void slowReceiverTimesOut() {
        server.delay = Duration.ofSeconds(3);
        try (WebhookContactSink sink = new WebhookContactSink(server.uri("/hook"), null, Duration.ofMillis(300))) {
            long start = System.nanoTime();
            assertThatThrownBy(() -> sink.deliver(message())).isInstanceOf(ContactDeliveryException.class);
            assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(3));
        }
    }

    @Test
    void unreachableReceiverFailsDelivery() throws Exception {
        int freePort;
        try (ServerSocket socket = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            freePort = socket.getLocalPort();
        }
        URI closed = URI.create("http://127.0.0.1:" + freePort + "/hook");
        try (WebhookContactSink sink = new WebhookContactSink(closed, null, Duration.ofSeconds(2))) {
            assertThatThrownBy(() -> sink.deliver(message())).isInstanceOf(ContactDeliveryException.class);
        }
    }

    @Test
    void rejectsNonHttpUrls() {
        assertThatThrownBy(() -> new WebhookContactSink(URI.create("file:///etc/passwd"), null, Duration.ofSeconds(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new WebhookContactSink(URI.create("relative/path"), null, Duration.ofSeconds(1)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
