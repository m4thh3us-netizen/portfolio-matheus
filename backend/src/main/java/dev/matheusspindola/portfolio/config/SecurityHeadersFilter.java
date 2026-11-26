package dev.matheusspindola.portfolio.config;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Basic hardening headers (QA-03) without a Spring Security dependency. Registered as the very first servlet filter
 * (see {@link WebConfig}) and headers are set <em>before</em> the chain runs, so responses written early by later
 * filters (CORS 403, 413 from {@link RequestSizeLimitFilter}) and error responses (404, 429, 5xx) carry them too.
 * <ul>
 *   <li>All responses: {@code X-Content-Type-Options: nosniff}, {@code Referrer-Policy: no-referrer},
 *       {@code X-Frame-Options: DENY}.</li>
 *   <li>All responses except Swagger UI / OpenAPI docs: {@code Content-Security-Policy: default-src 'none';
 *       frame-ancestors 'none'} (the API only serves JSON). Swagger UI needs its own scripts/styles, so it gets no CSP.</li>
 *   <li>{@code POST /api/contact}: {@code Cache-Control: no-store}.</li>
 * </ul>
 */
public class SecurityHeadersFilter extends OncePerRequestFilter {

    static final String API_CSP = "default-src 'none'; frame-ancestors 'none'";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("X-Frame-Options", "DENY");
        String path = pathWithinApplication(request);
        if (!isDocumentationPath(path)) {
            response.setHeader("Content-Security-Policy", API_CSP);
        }
        if ("POST".equals(request.getMethod()) && "/api/contact".equals(path)) {
            response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        }
        chain.doFilter(request, response);
    }

    /** Also run on error dispatches so a container-level forward to {@code /error} keeps the headers. */
    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }

    static boolean isDocumentationPath(String path) {
        return path.equals("/swagger-ui.html")
                || path.startsWith("/swagger-ui/")
                || path.equals("/v3/api-docs")
                || path.startsWith("/v3/api-docs/")
                || path.startsWith("/v3/api-docs.");
    }

    private static String pathWithinApplication(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        return (context != null && !context.isEmpty() && uri.startsWith(context)) ? uri.substring(context.length()) : uri;
    }
}
