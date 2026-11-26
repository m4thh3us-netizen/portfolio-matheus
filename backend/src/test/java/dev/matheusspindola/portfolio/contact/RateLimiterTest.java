package dev.matheusspindola.portfolio.contact;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;

class RateLimiterTest {

    /** Mutable clock for deterministic time travel. */
    static final class TestClock extends Clock {
        private volatile Instant now;

        TestClock(Instant start) {
            this.now = start;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final TestClock clock = new TestClock(Instant.parse("2026-11-19T20:00:00Z"));
    private final RateLimiter limiter = new RateLimiter(5, Duration.ofMinutes(10), clock);

    @Test
    void allowsUpToLimitThenRejectsWithRetryAfter() {
        for (int i = 0; i < 5; i++) {
            assertThat(limiter.tryAcquire("1.1.1.1").allowed()).isTrue();
            clock.advance(Duration.ofSeconds(10));
        }
        RateLimiter.Decision sixth = limiter.tryAcquire("1.1.1.1");
        assertThat(sixth.allowed()).isFalse();
        // oldest hit was 50 s ago → frees up in 10 min - 50 s
        assertThat(sixth.retryAfterSeconds()).isEqualTo(Duration.ofMinutes(10).minusSeconds(50).toSeconds());
    }

    @Test
    void keysAreIndependent() {
        for (int i = 0; i < 5; i++) {
            limiter.tryAcquire("a");
        }
        assertThat(limiter.tryAcquire("a").allowed()).isFalse();
        assertThat(limiter.tryAcquire("b").allowed()).isTrue();
    }

    @Test
    void windowSlides() {
        for (int i = 0; i < 5; i++) {
            limiter.tryAcquire("a");
        }
        assertThat(limiter.tryAcquire("a").allowed()).isFalse();

        clock.advance(Duration.ofMinutes(10).minusMillis(1));
        assertThat(limiter.tryAcquire("a").allowed()).isFalse();

        clock.advance(Duration.ofMillis(1));
        assertThat(limiter.tryAcquire("a").allowed()).isTrue();
    }

    @Test
    void rejectedAttemptsDoNotExtendTheWindow() {
        for (int i = 0; i < 5; i++) {
            limiter.tryAcquire("a");
        }
        clock.advance(Duration.ofMinutes(5));
        assertThat(limiter.tryAcquire("a").allowed()).isFalse();
        clock.advance(Duration.ofMinutes(5));
        assertThat(limiter.tryAcquire("a").allowed()).isTrue();
    }

    @Test
    void staleKeysAreEvictedByThePeriodicSweep() {
        for (int i = 0; i < 300; i++) {
            limiter.tryAcquire("ip-" + i);
        }
        assertThat(limiter.trackedKeys()).isEqualTo(300);
        clock.advance(Duration.ofMinutes(11));
        limiter.tryAcquire("fresh");
        assertThat(limiter.trackedKeys()).isEqualTo(1);
    }

    @Test
    void noSweepBeforeTheIntervalElapses() {
        RateLimiter small = new RateLimiter(1, Duration.ofSeconds(1), clock);
        small.tryAcquire("a");
        clock.advance(Duration.ofSeconds(2)); // "a" expired, but the sweep interval (60 s) has not elapsed
        small.tryAcquire("b");
        assertThat(small.trackedKeys()).isEqualTo(2);
    }

    @Test
    void whenKeyCapIsReachedNewKeysAreDeniedButKnownKeysStillWork() {
        RateLimiter capped = new RateLimiter(5, Duration.ofMinutes(10), 3, clock);
        assertThat(capped.tryAcquire("k1").allowed()).isTrue();
        assertThat(capped.tryAcquire("k2").allowed()).isTrue();
        assertThat(capped.tryAcquire("k3").allowed()).isTrue();

        RateLimiter.Decision fourth = capped.tryAcquire("k4");
        assertThat(fourth.allowed()).isFalse();
        assertThat(fourth.retryAfterSeconds()).isEqualTo(600);
        assertThat(capped.trackedKeys()).isEqualTo(3);

        assertThat(capped.tryAcquire("k1").allowed()).isTrue();
    }

    @Test
    void whenKeyCapIsReachedExpiredEntriesArePurgedToMakeRoom() {
        // Window 20 s and everything within 60 s: the periodic sweep is not due, so only the "map full" sweep can free room.
        RateLimiter capped = new RateLimiter(5, Duration.ofSeconds(20), 3, clock);
        capped.tryAcquire("k1");
        capped.tryAcquire("k2");
        clock.advance(Duration.ofSeconds(30));
        capped.tryAcquire("k3");
        clock.advance(Duration.ofSeconds(5)); // k1/k2 expired, k3 still live
        assertThat(capped.trackedKeys()).isEqualTo(3);

        assertThat(capped.tryAcquire("k4").allowed()).isTrue();
        assertThat(capped.trackedKeys()).isEqualTo(2);
    }

    @Test
    void concurrentRequestsFromOneKeyNeverExceedTheLimit() throws Exception {
        RateLimiter shared = new RateLimiter(5, Duration.ofMinutes(10), clock);
        int threads = 32;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<Boolean>> results = new ArrayList<>();
            for (int i = 0; i < threads * 4; i++) {
                results.add(pool.submit(() -> {
                    start.await();
                    return shared.tryAcquire("same").allowed();
                }));
            }
            start.countDown();
            int allowed = 0;
            for (Future<Boolean> result : results) {
                if (result.get()) {
                    allowed++;
                }
            }
            assertThat(allowed).isEqualTo(5);
        } finally {
            pool.shutdownNow();
        }
    }
}
