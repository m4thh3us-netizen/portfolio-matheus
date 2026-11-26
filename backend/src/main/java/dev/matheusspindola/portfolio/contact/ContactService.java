package dev.matheusspindola.portfolio.contact;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;

/**
 * Contact pipeline after rate limiting ({@link ContactRateLimitInterceptor}) and Bean Validation ({@code @Valid}):
 * anti-spam → delivery. A 202 is only produced after {@link ContactSink#deliver} returned normally.
 */
@Service
public class ContactService {

    private final SpamGuard spamGuard;
    private final ContactSink sink;
    private final Clock clock;

    public ContactService(SpamGuard spamGuard, ContactSink sink, Clock clock) {
        this.spamGuard = spamGuard;
        this.sink = sink;
        this.clock = clock;
    }

    public ContactResponse submit(ContactRequest request) {
        if (spamGuard.isSpam(request)) {
            throw new SubmissionRejectedException();
        }
        // ContactRequest already stripped the fields (and turned a blank subject into null).
        ContactMessage message = new ContactMessage(
                UUID.randomUUID(),
                Instant.now(clock),
                request.name(),
                request.email(),
                request.subject(),
                request.message());
        sink.deliver(message);
        return ContactResponse.received(message.id(), message.receivedAt());
    }
}
