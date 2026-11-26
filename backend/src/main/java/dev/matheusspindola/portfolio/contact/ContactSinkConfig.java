package dev.matheusspindola.portfolio.contact;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Chooses the single {@link ContactSink}:
 * <ol>
 *   <li>{@code APP_CONTACT_WEBHOOK_URL} set → {@link WebhookContactSink};</li>
 *   <li>else {@code APP_CONTACT_REQUIRE_DELIVERY=true} → {@link UnavailableContactSink} (every submission → 503);</li>
 *   <li>else {@link LoggingContactSink} (messages readable only in the application log) with a startup WARN.</li>
 * </ol>
 */
@Configuration
class ContactSinkConfig {

    private static final Logger log = LoggerFactory.getLogger(ContactSinkConfig.class);

    @Bean
    ContactSink contactSink(ContactProperties properties) {
        ContactProperties.Webhook webhook = properties.webhook();
        if (webhook.enabled()) {
            URI uri;
            try {
                uri = URI.create(webhook.url());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("APP_CONTACT_WEBHOOK_URL is not a valid URI");
            }
            log.info("Contact delivery: webhook (bearer token {}, timeout {})",
                    webhook.token() == null ? "not set" : "set", webhook.timeout());
            return new WebhookContactSink(uri, webhook.token(), webhook.timeout());
        }
        if (properties.requireDelivery()) {
            log.warn("APP_CONTACT_REQUIRE_DELIVERY=true but APP_CONTACT_WEBHOOK_URL is not set: "
                    + "POST /api/contact will answer 503 \"Contact delivery unavailable\".");
            return new UnavailableContactSink();
        }
        log.warn("APP_CONTACT_WEBHOOK_URL is not set: contact messages are only logged (LoggingContactSink). "
                + "Set APP_CONTACT_WEBHOOK_URL for real delivery or APP_CONTACT_REQUIRE_DELIVERY=true to answer 503 instead.");
        return new LoggingContactSink();
    }
}
