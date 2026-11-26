package dev.matheusspindola.portfolio.contact;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * In-memory sliding-window rate limiter keyed by client IP (or IPv6 /64).
 * <p>
 * Memory is bounded (ADR-002 §3): at most {@code maxTrackedKeys} keys are held. When the map is full a sweep of
 * expired entries is attempted (at most once per {@link #FULL_SWEEP_MIN_GAP}); if it is still full, new keys are
 * denied (fail closed → 429) while already-tracked keys keep working. Routine sweeps run at most once per
 * {@link #SWEEP_INTERVAL}, never on every request.
 * <p>
 * State is per instance and lost on restart, which is acceptable for a single-instance portfolio API.
 */
@Component
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    static final Duration SWEEP_INTERVAL = Duration.ofSeconds(60);
    static final Duration FULL_SWEEP_MIN_GAP = Duration.ofSeconds(1);
    private static final Duration FULL_WARN_EVERY = Duration.ofMinutes(1);

    private final int maxRequests;
    private final Duration window;
    private final int maxTrackedKeys;
    private final Clock clock;
    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();
    private final AtomicLong lastSweepMillis;
    private final AtomicLong lastFullWarnMillis = new AtomicLong(Long.MIN_VALUE);

    @Autowired
    public RateLimiter(ContactProperties properties, Clock clock) {
        this(properties.rateLimit().maxRequests(), properties.rateLimit().window(),
                properties.rateLimit().maxTrackedKeys(), clock);
    }

    public RateLimiter(int maxRequests, Duration window, Clock clock) {
        this(maxRequests, window, 10_000, clock);
    }

    public RateLimiter(int maxRequests, Duration window, int maxTrackedKeys, Clock clock) {
        if (maxRequests <= 0 || maxTrackedKeys <= 0 || window == null || window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("maxRequests, maxTrackedKeys and window must be positive");
        }
        this.maxRequests = maxRequests;
        this.window = window;
        this.maxTrackedKeys = maxTrackedKeys;
        this.clock = clock;
        this.lastSweepMillis = new AtomicLong(clock.millis());
    }

    /**
     * Records an attempt for {@code key} if it is within the limit.
     *
     * @return the decision; when rejected, {@link Decision#retryAfterSeconds()} is the wait until a slot frees up
     */
    public Decision tryAcquire(String key) {
        Instant now = clock.instant();
        sweepIfDue(now, SWEEP_INTERVAL);

        if (hits.size() >= maxTrackedKeys && !hits.containsKey(key)) {
            sweepIfDue(now, FULL_SWEEP_MIN_GAP);
            if (hits.size() >= maxTrackedKeys && !hits.containsKey(key)) {
                warnFull(now);
                return Decision.deny(window.toSeconds());
            }
        }

        Decision[] result = new Decision[1];
        // compute() runs atomically per key, so concurrent requests from one IP cannot exceed the limit.
        hits.compute(key, (k, deque) -> {
            Deque<Instant> timestamps = deque == null ? new ArrayDeque<>(maxRequests) : deque;
            evictExpired(timestamps, now);
            if (timestamps.size() >= maxRequests) {
                long millis = Duration.between(now, timestamps.peekFirst().plus(window)).toMillis();
                result[0] = Decision.deny(Math.max(1, (millis + 999) / 1000));
            } else {
                timestamps.addLast(now);
                result[0] = Decision.permit();
            }
            return timestamps;
        });
        return result[0];
    }

    private void evictExpired(Deque<Instant> deque, Instant now) {
        Instant threshold = now.minus(window);
        while (!deque.isEmpty() && !deque.peekFirst().isAfter(threshold)) {
            deque.pollFirst();
        }
    }

    /** Full-map sweep, but only if {@code minGap} elapsed since the last one; only one thread wins the CAS. */
    private void sweepIfDue(Instant now, Duration minGap) {
        long nowMillis = now.toEpochMilli();
        long last = lastSweepMillis.get();
        if (nowMillis - last < minGap.toMillis() || !lastSweepMillis.compareAndSet(last, nowMillis)) {
            return;
        }
        for (String key : hits.keySet()) {
            hits.computeIfPresent(key, (k, deque) -> {
                evictExpired(deque, now);
                return deque.isEmpty() ? null : deque;
            });
        }
    }

    private void warnFull(Instant now) {
        long nowMillis = now.toEpochMilli();
        long last = lastFullWarnMillis.get();
        if (nowMillis - last >= FULL_WARN_EVERY.toMillis() && lastFullWarnMillis.compareAndSet(last, nowMillis)) {
            log.warn("rate-limit.full trackedKeys={} max={} — denying new clients until entries expire",
                    hits.size(), maxTrackedKeys);
        }
    }

    int trackedKeys() {
        return hits.size();
    }

    public record Decision(boolean allowed, long retryAfterSeconds) {

        static Decision permit() {
            return new Decision(true, 0);
        }

        static Decision deny(long retryAfterSeconds) {
            return new Decision(false, retryAfterSeconds);
        }
    }
}
