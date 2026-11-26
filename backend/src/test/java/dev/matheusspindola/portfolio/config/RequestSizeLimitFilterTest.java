package dev.matheusspindola.portfolio.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Unit tests for the unknown-length (chunked) path, which MockMvc cannot express (it always knows the length). */
class RequestSizeLimitFilterTest {

    private final RequestSizeLimitFilter filter = new RequestSizeLimitFilter(16, new ObjectMapper());

    /** Simulates {@code Transfer-Encoding: chunked}: a body is present but its length is unknown. */
    private static MockHttpServletRequest chunked(String body) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/contact") {
            @Override
            public int getContentLength() {
                return -1;
            }

            @Override
            public long getContentLengthLong() {
                return -1;
            }
        };
        request.addHeader("Transfer-Encoding", "chunked");
        request.setContent(body.getBytes(StandardCharsets.UTF_8));
        return request;
    }

    @Test
    void chunkedBodyAboveLimitIs413AndNeverReachesTheChain() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(chunked("x".repeat(17)), response, chain);
        assertThat(response.getStatus()).isEqualTo(413);
        assertThat(response.getContentType()).startsWith("application/problem+json");
        assertThat(response.getContentAsString()).contains("\"title\":\"Payload too large\"");
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void chunkedBodyWithinLimitIsReplayedDownstream() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(chunked("{\"a\":\"ção\"}"), response, chain);
        HttpServletRequest forwarded = (HttpServletRequest) chain.getRequest();
        assertThat(forwarded).isNotNull();
        assertThat(new String(forwarded.getInputStream().readAllBytes(), StandardCharsets.UTF_8)).isEqualTo("{\"a\":\"ção\"}");
        assertThat(forwarded.getContentLengthLong()).isEqualTo("{\"a\":\"ção\"}".getBytes(StandardCharsets.UTF_8).length);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void exactlyAtLimitIsAccepted() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(chunked("x".repeat(16)), new MockHttpServletResponse(), chain);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void getRequestsAreNotBuffered() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/projects");
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        assertThat(chain.getRequest()).isSameAs(request);
    }
}
