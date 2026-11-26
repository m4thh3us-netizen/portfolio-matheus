package dev.matheusspindola.portfolio.contact;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** End-to-end: env placeholders → WebhookContactSink → loopback receiver; 202 only on 2xx, else 503. */
@SpringBootTest
@AutoConfigureMockMvc
class ContactWebhookIntegrationTest {

    private static final WebhookTestServer SERVER;
    private static final AtomicInteger IP_SEQ = new AtomicInteger(1);

    static {
        try {
            SERVER = new WebhookTestServer();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Set through the same env-style names used in production, proving the yml placeholders bind. */
    @DynamicPropertySource
    static void webhook(DynamicPropertyRegistry registry) {
        registry.add("APP_CONTACT_WEBHOOK_URL", () -> SERVER.uri("/contact").toString());
        registry.add("APP_CONTACT_WEBHOOK_TOKEN", () -> "test-token");
    }

    @AfterAll
    static void stopServer() {
        SERVER.close();
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    ContactSink sink;

    @BeforeEach
    void reset() {
        SERVER.reset();
    }

    private ResultActions submit() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", "Ana Souza");
        body.put("email", "ana@example.com");
        body.put("subject", "Oportunidade");
        body.put("message", "Olá Matheus, gostaria de conversar sobre uma vaga.");
        body.put("website", "");
        body.put("startedAt", System.currentTimeMillis() - 10_000);
        String ip = "10.2.0." + IP_SEQ.getAndIncrement();
        return mvc.perform(post("/api/contact")
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    @Test
    void webhookSinkIsSelectedWhenUrlIsSet() {
        assertThat(sink).isInstanceOf(WebhookContactSink.class);
    }

    @Test
    void acceptedOnlyAfterWebhookAnswered2xx() throws Exception {
        submit().andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("RECEIVED"));
        assertThat(SERVER.received).hasSize(1);
        assertThat(SERVER.received.get(0).authorization()).isEqualTo("Bearer test-token");
        assertThat(SERVER.received.get(0).body()).contains("\"email\":\"ana@example.com\"").contains("\"subject\":\"Oportunidade\"");
    }

    @Test
    void webhookErrorIs503NotAccepted() throws Exception {
        SERVER.status = 500;
        submit()
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.title").value("Contact delivery unavailable"));
    }
}
