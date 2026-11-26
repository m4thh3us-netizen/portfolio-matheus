package dev.matheusspindola.portfolio.contact;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Contact form payload. Text fields are stripped in the compact constructor, so Bean Validation checks
 * exactly the values that will be delivered (a blank {@code subject} becomes {@code null}).
 */
public record ContactRequest(
        @NotBlank @Size(min = 2, max = 80)
        String name,

        // The regexp additionally requires a dot in the domain (rejects "ana@localhost"); message stays the default.
        @NotBlank @Email(regexp = "[^@]+@[^@]+\\.[^@]+") @Size(max = 120)
        String email,

        @Size(max = 120)
        String subject,

        @NotBlank @Size(min = 10, max = 2000)
        String message,

        // No constraint on purpose: any non-blank value is rejected generically by SpamGuard, without
        // revealing which field is the trap. The whole body is already capped by RequestSizeLimitFilter.
        @Schema(description = "Honeypot field; must be left empty")
        String website,

        @Schema(description = "Epoch milliseconds when the form was rendered", example = "1732046400000")
        @NotNull
        Long startedAt) {

    public ContactRequest {
        name = strip(name);
        email = strip(email);
        subject = strip(subject);
        if (subject != null && subject.isEmpty()) {
            subject = null;
        }
        message = strip(message);
    }

    private static String strip(String value) {
        return value == null ? null : value.strip();
    }
}
