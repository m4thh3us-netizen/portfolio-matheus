package dev.matheusspindola.portfolio.config;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Set;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Enforces {@code app.max-body-bytes} on {@code /api/**} (ADR-002 §1), whether or not {@code Content-Length} is sent.
 * <ul>
 *   <li>Declared {@code Content-Length} above the limit → 413 without reading the body.</li>
 *   <li>Unknown length (e.g. {@code Transfer-Encoding: chunked}) → at most {@code max + 1} bytes are read; above the
 *       limit → 413, otherwise the buffered body is replayed downstream via {@link CachedBodyRequest}.</li>
 * </ul>
 * Worst-case memory per request is therefore {@code max + 1} bytes. Field-level limits are enforced by Bean Validation.
 */
@Component
public class RequestSizeLimitFilter extends OncePerRequestFilter {

    private static final Set<String> BODY_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final long maxBodyBytes;
    private final ObjectMapper objectMapper;

    public RequestSizeLimitFilter(@Value("${app.max-body-bytes:16384}") long maxBodyBytes, ObjectMapper objectMapper) {
        if (maxBodyBytes <= 0 || maxBodyBytes > Integer.MAX_VALUE - 1) {
            throw new IllegalArgumentException("app.max-body-bytes must be between 1 and Integer.MAX_VALUE - 1");
        }
        this.maxBodyBytes = maxBodyBytes;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long declared = request.getContentLengthLong();
        if (declared > maxBodyBytes) {
            reject(request, response);
            return;
        }
        if (declared < 0 && BODY_METHODS.contains(request.getMethod())) {
            InputStream in = request.getInputStream();
            byte[] body = in.readNBytes((int) maxBodyBytes + 1);
            if (body.length > maxBodyBytes) {
                reject(request, response);
                return;
            }
            chain.doFilter(new CachedBodyRequest(request, body), response);
            return;
        }
        chain.doFilter(request, response);
    }

    private void reject(HttpServletRequest request, HttpServletResponse response) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE,
                "Request body exceeds the allowed size.");
        problem.setTitle("Payload too large");
        problem.setInstance(URI.create(request.getRequestURI()));
        response.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        // Ask the container to close the connection rather than draining an arbitrarily long chunked body.
        response.setHeader("Connection", "close");
        objectMapper.writeValue(response.getWriter(), problem);
    }
}
