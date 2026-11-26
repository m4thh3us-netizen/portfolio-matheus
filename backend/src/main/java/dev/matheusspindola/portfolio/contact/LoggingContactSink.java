package dev.matheusspindola.portfolio.contact;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Fallback sink used when no webhook is configured: writes the submission to the application log so the owner can
 * read it in the platform's log viewer. Subject and message are escaped (single line, no log forging) and truncated;
 * the name is sanitized and truncated; the e-mail is masked. Registered by {@link ContactSinkConfig}.
 */
public class LoggingContactSink implements ContactSink {

    private static final Logger log = LoggerFactory.getLogger(LoggingContactSink.class);

    static final int MAX_NAME = 80;
    static final int MAX_SUBJECT = 120;
    static final int MAX_MESSAGE = 2000;

    @Override
    public void deliver(ContactMessage message) {
        log.info("contact.received id={} name=\"{}\" email={} subject=\"{}\" message=\"{}\"",
                message.id(),
                LogSanitizer.truncate(LogSanitizer.sanitize(message.name()), MAX_NAME),
                LogSanitizer.maskEmail(message.email()),
                LogSanitizer.escape(message.subject(), MAX_SUBJECT),
                LogSanitizer.escape(message.message(), MAX_MESSAGE));
    }

    static String maskEmail(String email) {
        return LogSanitizer.maskEmail(email);
    }

    static String sanitize(String value) {
        return LogSanitizer.sanitize(value);
    }
}
