package dev.matheusspindola.portfolio.contact;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** {@code APP_CONTACT_REQUIRE_DELIVERY=true} without a webhook: valid submissions get 503, never 202. */
@SpringBootTest(properties = "APP_CONTACT_REQUIRE_DELIVERY=true")
@AutoConfigureMockMvc
class RequireDeliveryTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContactSink sink;

    @Test
    void validSubmissionIs503WhenNoDeliveryChannelIsConfigured() throws Exception {
        assertThat(sink).isInstanceOf(UnavailableContactSink.class);
        String body = """
                {"name":"Ana Souza","email":"ana@example.com","subject":"Oi",
                 "message":"Olá Matheus, gostaria de conversar.","website":"","startedAt":%d}
                """.formatted(System.currentTimeMillis() - 10_000);
        mvc.perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.title").value("Contact delivery unavailable"));
    }
}
