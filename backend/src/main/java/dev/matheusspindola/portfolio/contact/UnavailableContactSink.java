package dev.matheusspindola.portfolio.contact;

/**
 * Used when {@code app.contact.require-delivery=true} but no real delivery channel is configured:
 * every submission fails with {@link ContactDeliveryException} (→ 503) instead of a silent "log only" success.
 */
public class UnavailableContactSink implements ContactSink {

    @Override
    public void deliver(ContactMessage message) {
        throw new ContactDeliveryException("No contact delivery channel is configured");
    }
}
