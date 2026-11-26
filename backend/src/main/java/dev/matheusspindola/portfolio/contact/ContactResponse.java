package dev.matheusspindola.portfolio.contact;

import java.time.Instant;
import java.util.UUID;

public record ContactResponse(String status, UUID id, Instant receivedAt) {

    public static ContactResponse received(UUID id, Instant receivedAt) {
        return new ContactResponse("RECEIVED", id, receivedAt);
    }
}
