package dev.matheusspindola.portfolio.contact;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Contact form settings ({@code app.contact.*}).
 *
 * @param minFillTime     minimum time between form render ({@code startedAt}) and submission
 * @param requireDelivery when {@code true} and no webhook is configured, submissions are answered with 503
 *                        instead of being only logged (env {@code APP_CONTACT_REQUIRE_DELIVERY})
 * @param webhook         optional webhook delivery target
 * @param rateLimit       per-IP sliding window limit
 */
@ConfigurationProperties(prefix = "app.contact")
public record ContactProperties(Duration minFillTime, boolean requireDelivery, Webhook webhook, RateLimit rateLimit) {

    public ContactProperties {
        minFillTime = minFillTime == null ? Duration.ofSeconds(3) : minFillTime;
        webhook = webhook == null ? new Webhook(null, null, null) : webhook;
        rateLimit = rateLimit == null ? new RateLimit(0, null, 0) : rateLimit;
    }

    /**
     * @param url     target URL (env {@code APP_CONTACT_WEBHOOK_URL}); blank disables the webhook sink
     * @param token   optional bearer token (env {@code APP_CONTACT_WEBHOOK_TOKEN})
     * @param timeout connect and read timeout
     */
    public record Webhook(String url, String token, Duration timeout) {

        public Webhook {
            url = url == null || url.isBlank() ? null : url.strip();
            token = token == null || token.isBlank() ? null : token.strip();
            timeout = timeout == null ? Duration.ofSeconds(5) : timeout;
        }

        public boolean enabled() {
            return url != null;
        }

        @Override
        public String toString() {
            return "Webhook[url=" + (url == null ? "<none>" : "<set>") + ", token=" + (token == null ? "<none>" : "<set>")
                    + ", timeout=" + timeout + "]";
        }
    }

    /**
     * @param maxRequests    attempts allowed per key per window
     * @param window         sliding window length
     * @param maxTrackedKeys cap on distinct keys held in memory; when full, new keys are denied (fail closed)
     */
    public record RateLimit(int maxRequests, Duration window, int maxTrackedKeys) {

        public RateLimit {
            maxRequests = maxRequests <= 0 ? 5 : maxRequests;
            window = window == null ? Duration.ofMinutes(10) : window;
            maxTrackedKeys = maxTrackedKeys <= 0 ? 10_000 : maxTrackedKeys;
        }
    }
}
