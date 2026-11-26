package dev.matheusspindola.portfolio.contact;

import java.time.Clock;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Cheap bot filters: a honeypot field that must stay empty and a minimum time between form render
 * ({@code startedAt}) and submission. A {@code startedAt} in the future always fails the minimum-time check.
 */
@Component
public class SpamGuard {

    private final Duration minFillTime;
    private final Clock clock;

    @Autowired
    public SpamGuard(ContactProperties properties, Clock clock) {
        this(properties.minFillTime(), clock);
    }

    public SpamGuard(Duration minFillTime, Clock clock) {
        this.minFillTime = minFillTime;
        this.clock = clock;
    }

    /** @return {@code true} if the submission looks automated and must be rejected */
    public boolean isSpam(ContactRequest request) {
        if (request.website() != null && !request.website().isBlank()) {
            return true;
        }
        if (request.startedAt() == null) {
            return true;
        }
        return clock.millis() - request.startedAt() < minFillTime.toMillis();
    }
}
