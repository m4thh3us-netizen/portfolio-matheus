package dev.matheusspindola.portfolio.contact;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** M4 (2) and (3): the sink receives the normalized message, and a failing sink never yields 202. */
@SpringBootTest
@AutoConfigureMockMvc
class ContactDeliveryTest {

    private static final AtomicInteger IP_SEQ = new AtomicInteger(1);

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockitoBean
    ContactSink sink;

    @AfterEach
    void resetSink() {
        reset(sink);
    }

    private ResultActions submit(Map<String, Object> body) throws Exception {
        String ip = "10.1.0." + IP_SEQ.getAndIncrement();
        return mvc.perform(post("/api/contact")
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private static Map<String, Object> body() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", "  Ana Souza  ");
        body.put("email", " ana@example.com ");
        body.put("subject", "   ");
        body.put("message", "\n  Olá Matheus, gostaria de conversar.  \n");
        body.put("website", "");
        body.put("startedAt", System.currentTimeMillis() - 10_000);
        return body;
    }

    @Test
    void sinkReceivesTheNormalizedMessage() throws Exception {
        String id = submit(body())
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();

        ArgumentCaptor<ContactMessage> captor = ArgumentCaptor.forClass(ContactMessage.class);
        verify(sink).deliver(captor.capture());
        ContactMessage delivered = captor.getValue();
        assertThat(delivered.name()).isEqualTo("Ana Souza");
        assertThat(delivered.email()).isEqualTo("ana@example.com");
        assertThat(delivered.subject()).isNull();
        assertThat(delivered.message()).isEqualTo("Olá Matheus, gostaria de conversar.");
        assertThat(id).contains(delivered.id().toString());
    }

    @Test
    void deliveryFailureIs503AndNever202() throws Exception {
        doThrow(new ContactDeliveryException("down")).when(sink).deliver(any());
        submit(body())
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Contact delivery unavailable"))
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.instance").value("/api/contact"))
                .andExpect(jsonPath("$.id").doesNotExist());
    }

    @Test
    void unexpectedSinkErrorIs500AndNever202() throws Exception {
        doThrow(new IllegalStateException("boom")).when(sink).deliver(any());
        submit(body())
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.title").value("Internal Server Error"))
                .andExpect(jsonPath("$.detail").value("An unexpected error occurred."));
    }

    @Test
    void sinkIsNotCalledForInvalidOrSpamSubmissions() throws Exception {
        Map<String, Object> invalid = body();
        invalid.put("email", "nope");
        submit(invalid).andExpect(status().isBadRequest());

        Map<String, Object> spam = body();
        spam.put("website", "x");
        submit(spam).andExpect(status().isBadRequest());

        verify(sink, never()).deliver(any());
    }
}
