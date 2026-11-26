package dev.matheusspindola.portfolio.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.function.Consumer;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * M4 (5): the client-IP settings bind from the env-style names in application.yml
 * ({@code APP_CLIENT_IP_TRUSTED_HOPS}, {@code APP_CLIENT_IP_HEADER}, deprecated {@code APP_TRUST_PROXY})
 * and drive the rate-limit key end to end. Malformed bodies are used on purpose: they still count.
 */
class ClientIpBindingTest {

    static ResultActions attempt(MockMvc mvc, Consumer<MockHttpServletRequest> customizer) throws Exception {
        return mvc.perform(post("/api/contact")
                .with(request -> {
                    request.setRemoteAddr("10.9.9.9"); // the proxy: identical for every visitor
                    customizer.accept(request);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{"));
    }

    @Nested
    @SpringBootTest(properties = "APP_CLIENT_IP_TRUSTED_HOPS=1")
    @AutoConfigureMockMvc
    class TrustedHops {

        @Autowired
        MockMvc mvc;

        @Test
        void spoofedLeftMostEntriesDoNotBypassTheLimit() throws Exception {
            for (int i = 0; i < 5; i++) {
                String spoof = "198.51.100." + i;
                attempt(mvc, r -> r.addHeader("X-Forwarded-For", spoof + ", 203.0.113.50")).andExpect(status().isBadRequest());
            }
            attempt(mvc, r -> r.addHeader("X-Forwarded-For", "198.51.100.99, 203.0.113.50"))
                    .andExpect(status().isTooManyRequests());
            // a different real client behind the same proxy has its own bucket
            attempt(mvc, r -> r.addHeader("X-Forwarded-For", "203.0.113.51")).andExpect(status().isBadRequest());
        }

        @Test
        void ipv6ClientsRotatingWithinTheirSlash64ShareOneBucket() throws Exception {
            for (int i = 1; i <= 5; i++) {
                String ip = "2001:db8:1:2::" + Integer.toHexString(i);
                attempt(mvc, r -> r.addHeader("X-Forwarded-For", ip)).andExpect(status().isBadRequest());
            }
            attempt(mvc, r -> r.addHeader("X-Forwarded-For", "2001:db8:1:2:ffff::1")).andExpect(status().isTooManyRequests());
        }
    }

    @Nested
    @SpringBootTest(properties = {"APP_CLIENT_IP_HEADER=Fly-Client-IP", "APP_CLIENT_IP_TRUSTED_HOPS=1"})
    @AutoConfigureMockMvc
    class PlatformHeader {

        @Autowired
        MockMvc mvc;

        @Test
        void platformHeaderDefinesTheBucket() throws Exception {
            for (int i = 0; i < 5; i++) {
                String xff = "203.0.113." + (100 + i); // even the right-most XFF varies: header wins
                attempt(mvc, r -> {
                    r.addHeader("Fly-Client-IP", "198.51.100.7");
                    r.addHeader("X-Forwarded-For", xff);
                }).andExpect(status().isBadRequest());
            }
            attempt(mvc, r -> r.addHeader("Fly-Client-IP", "198.51.100.7")).andExpect(status().isTooManyRequests());
            attempt(mvc, r -> r.addHeader("Fly-Client-IP", "198.51.100.8")).andExpect(status().isBadRequest());
        }
    }

    @Nested
    @SpringBootTest(properties = "APP_TRUST_PROXY=true")
    @AutoConfigureMockMvc
    class LegacyTrustProxy {

        @Autowired
        MockMvc mvc;

        @Test
        void deprecatedFlagBehavesAsOneTrustedHop() throws Exception {
            for (int i = 0; i < 5; i++) {
                String spoof = "198.51.100." + i;
                attempt(mvc, r -> r.addHeader("X-Forwarded-For", spoof + ", 203.0.113.60")).andExpect(status().isBadRequest());
            }
            attempt(mvc, r -> r.addHeader("X-Forwarded-For", "1.2.3.4, 203.0.113.60")).andExpect(status().isTooManyRequests());
        }
    }
}
