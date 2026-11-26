package dev.matheusspindola.portfolio.contact;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
class LoggingContactSinkTest {

    @Test
    void masksEmail() {
        assertThat(LoggingContactSink.maskEmail("ana@example.com")).isEqualTo("a***@example.com");
        assertThat(LoggingContactSink.maskEmail("nope")).isEqualTo("***");
    }

    @Test
    void sanitizesControlCharactersAndUnicodeLineSeparators() {
        assertThat(LoggingContactSink.sanitize("Ana\nFAKE LOG")).isEqualTo("Ana_FAKE LOG");
        assertThat(LoggingContactSink.sanitize("Ana FAKE LOG\"")).isEqualTo("Ana_FAKE_LOG_");
    }

    @Test
    void escapeKeepsTextReadableOnOneLineAndTruncates() {
        assertThat(LogSanitizer.escape("a\r\nb\"c\\d e", 100)).isEqualTo("a\\r\\nb\\\"c\\\\d\\u2028e");
        assertThat(LogSanitizer.escape("abcdef", 3)).isEqualTo("abc...[truncated]");
        assertThat(LogSanitizer.escape(null, 3)).isEmpty();
    }

    @Test
    void logsSubjectAndMessageSoTheOwnerCanReadThemButMasksTheEmail(CapturedOutput output) {
        UUID id = UUID.randomUUID();
        new LoggingContactSink().deliver(new ContactMessage(id, Instant.now(), "Ana\nINFO forged",
                "ana.souza@example.com", "Vaga", "Linha 1\nINFO forged entry x"));

        String line = output.getOut().lines().filter(l -> l.contains("contact.received id=" + id)).findFirst().orElseThrow();
        assertThat(line).contains("name=\"Ana_INFO forged\"")
                .contains("email=a***@example.com")
                .contains("subject=\"Vaga\"")
                .contains("message=\"Linha 1\\nINFO forged entry\\u2028x\"")
                .doesNotContain("ana.souza@example.com");
        assertThat(output.getOut()).doesNotContain("\nINFO forged");
    }
}
