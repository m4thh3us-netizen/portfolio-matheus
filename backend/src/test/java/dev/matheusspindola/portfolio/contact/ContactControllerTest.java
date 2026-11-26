package dev.matheusspindola.portfolio.contact;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class ContactControllerTest {

    /** Each test uses its own client IP so the shared in-memory rate limiter does not leak between tests. */
    private static final AtomicInteger IP_SEQ = new AtomicInteger(1);

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    private static String nextIp() {
        return "10.0.0." + IP_SEQ.getAndIncrement();
    }

    private static Map<String, Object> validBody() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", "Ana Souza");
        body.put("email", "ana@example.com");
        body.put("subject", "Oportunidade");
        body.put("message", "Olá Matheus, gostaria de conversar sobre uma vaga.");
        body.put("website", "");
        body.put("startedAt", System.currentTimeMillis() - 10_000);
        return body;
    }

    private ResultActions submit(Object body, String ip) throws Exception {
        return mvc.perform(post("/api/contact")
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(body instanceof String s ? s : objectMapper.writeValueAsString(body)));
    }

    @Test
    void acceptsValidSubmission() throws Exception {
        submit(validBody(), nextIp())
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RECEIVED"))
                .andExpect(jsonPath("$.id").value(matchesPattern("[0-9a-f-]{36}")))
                .andExpect(jsonPath("$.receivedAt").isString());
    }

    @Test
    void invalidFieldsReturnValidationProblemWithErrorsMap() throws Exception {
        Map<String, Object> body = validBody();
        body.put("email", "not-an-email");
        body.put("name", "A");
        body.put("message", "short");
        submit(body, nextIp())
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.type").value("about:blank"))
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value("One or more fields are invalid."))
                .andExpect(jsonPath("$.instance").value("/api/contact"))
                .andExpect(jsonPath("$.errors.email").value("must be a well-formed email address"))
                .andExpect(jsonPath("$.errors.name").isString())
                .andExpect(jsonPath("$.errors.message").isString())
                .andExpect(jsonPath("$.errors.subject").doesNotExist());
    }

    @Test
    void missingStartedAtIsValidationError() throws Exception {
        Map<String, Object> body = validBody();
        body.remove("startedAt");
        submit(body, nextIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.startedAt").isString());
    }

    @Test
    void honeypotFilledIsRejected() throws Exception {
        Map<String, Object> body = validBody();
        body.put("website", "http://spam.example");
        submit(body, nextIp())
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Submission rejected"))
                .andExpect(jsonPath("$.errors").doesNotExist());
    }

    @Test
    void tooFastSubmissionIsRejected() throws Exception {
        Map<String, Object> body = validBody();
        body.put("startedAt", System.currentTimeMillis() - 500);
        submit(body, nextIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Submission rejected"));
    }

    @Test
    void malformedJsonReturns400Problem() throws Exception {
        submit("{\"name\": ", nextIp())
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Malformed request"))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void sixthRequestFromSameIpIsRateLimited() throws Exception {
        String ip = nextIp();
        for (int i = 0; i < 5; i++) {
            submit(validBody(), ip).andExpect(status().isAccepted());
        }
        submit(validBody(), ip)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", matchesPattern("[1-9]\\d*")))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Too many requests"))
                .andExpect(jsonPath("$.status").value(429));

        // a different client is unaffected
        submit(validBody(), nextIp()).andExpect(status().isAccepted());
    }

    @Test
    void forwardedForIsIgnoredByDefault() throws Exception {
        String ip = nextIp();
        for (int i = 0; i < 5; i++) {
            int n = i;
            mvc.perform(post("/api/contact")
                            .with(request -> {
                                request.setRemoteAddr(ip);
                                return request;
                            })
                            .header("X-Forwarded-For", "203.0.113." + n)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validBody())))
                    .andExpect(status().isAccepted());
        }
        mvc.perform(post("/api/contact")
                        .with(request -> {
                            request.setRemoteAddr(ip);
                            return request;
                        })
                        .header("X-Forwarded-For", "203.0.113.99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validBody())))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void oversizedBodyIsRejectedBeforeParsing() throws Exception {
        Map<String, Object> body = validBody();
        body.put("message", "x".repeat(20_000));
        submit(body, nextIp())
                .andExpect(status().isPayloadTooLarge())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    // ---- M1 / M4(1): every attempt counts, the limiter runs before body parsing ----

    private void assertSixthIsRateLimited(String ip) throws Exception {
        submit(validBody(), ip)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.title").value("Too many requests"));
    }

    @Test
    void invalidAttemptsCountTowardTheLimit() throws Exception {
        String ip = nextIp();
        Map<String, Object> invalid = validBody();
        invalid.put("email", "not-an-email");
        for (int i = 0; i < 5; i++) {
            submit(invalid, ip).andExpect(status().isBadRequest()).andExpect(jsonPath("$.title").value("Validation failed"));
        }
        assertSixthIsRateLimited(ip);
    }

    @Test
    void spamAttemptsCountTowardTheLimit() throws Exception {
        String ip = nextIp();
        Map<String, Object> spam = validBody();
        spam.put("website", "http://spam.example");
        for (int i = 0; i < 5; i++) {
            submit(spam, ip).andExpect(status().isBadRequest()).andExpect(jsonPath("$.title").value("Submission rejected"));
        }
        assertSixthIsRateLimited(ip);
    }

    @Test
    void malformedJsonAttemptsCountAndBlockedClientGets429NotParseError() throws Exception {
        String ip = nextIp();
        for (int i = 0; i < 5; i++) {
            submit("{\"name\": ", ip).andExpect(status().isBadRequest());
        }
        submit("{\"name\": ", ip).andExpect(status().isTooManyRequests());
        assertSixthIsRateLimited(ip);
    }

    @Test
    void unsupportedMediaTypeAttemptsCount() throws Exception {
        String ip = nextIp();
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/contact")
                            .with(request -> {
                                request.setRemoteAddr(ip);
                                return request;
                            })
                            .contentType(MediaType.TEXT_PLAIN)
                            .content("hello"))
                    .andExpect(status().isUnsupportedMediaType());
        }
        assertSixthIsRateLimited(ip);
    }

    @Test
    void rateLimitedResponseCarriesCorsHeaders() throws Exception {
        String ip = nextIp();
        for (int i = 0; i < 5; i++) {
            submit("{", ip);
        }
        mvc.perform(post("/api/contact")
                        .with(request -> {
                            request.setRemoteAddr(ip);
                            return request;
                        })
                        .header("Origin", "http://localhost:3000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validBody())))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                .andExpect(header().string("Access-Control-Expose-Headers", org.hamcrest.Matchers.containsString("Retry-After")));
    }

    // ---- B1: 413 from the filter carries CORS headers ----

    @Test
    void payloadTooLargeCarriesCorsHeaders() throws Exception {
        Map<String, Object> body = validBody();
        body.put("message", "x".repeat(20_000));
        mvc.perform(post("/api/contact")
                        .with(request -> {
                            request.setRemoteAddr(nextIp());
                            return request;
                        })
                        .header("Origin", "http://localhost:3000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.title").value("Payload too large"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    // ---- B2 / B3 / B10 ----

    @Test
    void longHoneypotIsRejectedGenericallyWithoutNamingTheField() throws Exception {
        Map<String, Object> body = validBody();
        body.put("website", "x".repeat(500));
        submit(body, nextIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Submission rejected"))
                .andExpect(jsonPath("$.errors").doesNotExist());
    }

    @Test
    void fieldsAreValidatedAfterStripping() throws Exception {
        Map<String, Object> body = validBody();
        body.put("name", "   A   ");
        body.put("message", "         x");
        submit(body, nextIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").isString())
                .andExpect(jsonPath("$.errors.message").isString());
    }

    @Test
    void emailWithoutDotInDomainIsInvalidWithDefaultMessage() throws Exception {
        Map<String, Object> body = validBody();
        body.put("email", "ana@localhost");
        submit(body, nextIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").value("must be a well-formed email address"));
    }

    @Test
    void getOnContactIsMethodNotAllowedAndDoesNotCount() throws Exception {
        String ip = nextIp();
        for (int i = 0; i < 6; i++) {
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/contact")
                            .with(request -> {
                                request.setRemoteAddr(ip);
                                return request;
                            }))
                    .andExpect(status().isMethodNotAllowed());
        }
        submit(validBody(), ip).andExpect(status().isAccepted());
    }
}
