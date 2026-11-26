package dev.matheusspindola.portfolio.contact;

/**
 * Delivery port for accepted contact messages (log, e-mail, queue...).
 * Implementations must throw if the message could not be delivered, so the API never reports a false success.
 */
public interface ContactSink {

    void deliver(ContactMessage message);
}
