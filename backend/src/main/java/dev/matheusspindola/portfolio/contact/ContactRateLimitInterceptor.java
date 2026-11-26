package dev.matheusspindola.portfolio.contact;

import dev.matheusspindola.portfolio.config.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Counts every {@code POST /api/contact} attempt against the per-IP limit <b>before</b> the body is parsed
 * (ADR-002 §4): malformed JSON, wrong {@code Content-Type}, invalid fields and spam all consume a slot.
 * The thrown {@link RateLimitExceededException} is rendered as 429 by the global exception handler.
 */
@Component
public class ContactRateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiter rateLimiter;
    private final ClientIpResolver clientIpResolver;

    public ContactRateLimitInterceptor(RateLimiter rateLimiter, ClientIpResolver clientIpResolver) {
        this.rateLimiter = rateLimiter;
        this.clientIpResolver = clientIpResolver;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!"POST".equals(request.getMethod())) {
            return true;
        }
        RateLimiter.Decision decision = rateLimiter.tryAcquire(clientIpResolver.resolveKey(request));
        if (!decision.allowed()) {
            throw new RateLimitExceededException(decision.retryAfterSeconds());
        }
        return true;
    }
}
