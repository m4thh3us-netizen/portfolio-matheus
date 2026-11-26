package dev.matheusspindola.portfolio.contact;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class SpamGuardTest {

    private static final Instant NOW = Instant.parse("2026-11-19T20:00:00Z");

    private final SpamGuard guard = new SpamGuard(Duration.ofSeconds(3), Clock.fixed(NOW, ZoneOffset.UTC));

    private static ContactRequest request(String website, Long startedAt) {
        return new ContactRequest("Ana Souza", "ana@example.com", null, "Mensagem de teste.", website, startedAt);
    }

    private static long ago(Duration d) {
        return NOW.minus(d).toEpochMilli();
    }

    @Test
    void acceptsHumanPacedSubmission() {
        assertThat(guard.isSpam(request("", ago(Duration.ofSeconds(30))))).isFalse();
        assertThat(guard.isSpam(request(null, ago(Duration.ofSeconds(3))))).isFalse();
    }

    @Test
    void rejectsFilledHoneypot() {
        assertThat(guard.isSpam(request("x", ago(Duration.ofMinutes(1))))).isTrue();
        assertThat(guard.isSpam(request("x".repeat(500), ago(Duration.ofMinutes(1))))).isTrue();
    }

    @Test
    void whitespaceOnlyHoneypotIsTreatedAsEmpty() {
        assertThat(guard.isSpam(request("   ", ago(Duration.ofMinutes(1))))).isFalse();
    }

    @Test
    void rejectsTooFastSubmission() {
        assertThat(guard.isSpam(request("", ago(Duration.ofMillis(2999))))).isTrue();
    }

    @Test
    void rejectsStartedAtInTheFuture() {
        assertThat(guard.isSpam(request("", NOW.plus(Duration.ofMinutes(2)).toEpochMilli()))).isTrue();
        assertThat(guard.isSpam(request("", NOW.plusSeconds(10).toEpochMilli()))).isTrue();
    }

    @Test
    void rejectsMissingStartedAt() {
        assertThat(guard.isSpam(request("", null))).isTrue();
    }
}
