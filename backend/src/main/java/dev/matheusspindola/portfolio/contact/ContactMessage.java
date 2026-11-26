package dev.matheusspindola.portfolio.contact;

import java.time.Instant;
import java.util.UUID;

/** A validated, accepted contact submission handed to a {@link ContactSink}. */
public record ContactMessage(
        UUID id,
        Instant receivedAt,
        String name,
        String email,
        String subject,
        String message) {
}
