package dev.matheusspindola.portfolio.contact;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.lang.Nullable;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Delivers contact messages by POSTing JSON {@code {id, receivedAt, name, email, subject, message}} to
 * {@code APP_CONTACT_WEBHOOK_URL}, with {@code Authorization: Bearer <APP_CONTACT_WEBHOOK_TOKEN>} when a token is set.
 * Any non-2xx answer, timeout or I/O error raises {@link ContactDeliveryException} (→ 503), so the API never answers
 * 202 for an undelivered message. Redirects are not followed. The URL and token are never logged (webhook URLs often
 * embed secrets).
 */
public class WebhookContactSink implements ContactSink, AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(WebhookContactSink.class);

    /** JSON body sent to the webhook. */
    public record Payload(String id, String receivedAt, String name, String email, String subject, String message) {

        static Payload of(ContactMessage m) {
            return new Payload(m.id().toString(), m.receivedAt().toString(), m.name(), m.email(), m.subject(), m.message());
        }
    }

    private final URI url;
    @Nullable
    private final String token;
    private final HttpClient httpClient;
    private final RestClient restClient;

    public WebhookContactSink(URI url, @Nullable String token, Duration timeout) {
        String scheme = url.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http")) || url.getHost() == null) {
            throw new IllegalArgumentException("APP_CONTACT_WEBHOOK_URL must be an absolute http(s) URL");
        }
        this.url = url;
        this.token = token == null || token.isBlank() ? null : token;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(timeout)
                .followRedirects(HttpClient.Redirect.NEVER)
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(timeout);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public void deliver(ContactMessage message) {
        HttpStatusCode status;
        try {
            ResponseEntity<Void> response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> {
                        if (token != null) {
                            h.setBearerAuth(token);
                        }
                    })
                    .body(Payload.of(message))
                    .retrieve()
                    .onStatus(s -> true, (req, res) -> { }) // status is checked below, for every non-2xx
                    .toBodilessEntity();
            status = response.getStatusCode();
        } catch (RestClientException e) {
            Throwable root = e.getMostSpecificCause();
            // Exception messages may contain the webhook URL (and thus a secret) → log class names only.
            log.warn("contact.delivery_failed id={} channel=webhook error={}", message.id(), root.getClass().getSimpleName());
            throw new ContactDeliveryException("Webhook delivery failed", e);
        }
        if (!status.is2xxSuccessful()) {
            log.warn("contact.delivery_failed id={} channel=webhook status={}", message.id(), status.value());
            throw new ContactDeliveryException("Webhook answered " + status.value());
        }
        log.info("contact.delivered id={} channel=webhook status={}", message.id(), status.value());
    }

    @Override
    public void close() {
        httpClient.close();
    }
}
