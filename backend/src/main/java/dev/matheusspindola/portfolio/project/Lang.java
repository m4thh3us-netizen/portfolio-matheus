package dev.matheusspindola.portfolio.project;

import java.util.Locale;

/** Supported content languages. Unknown or missing values fall back to {@link #PT}. */
public enum Lang {
    PT, EN;

    public static Lang from(String value) {
        if (value == null) {
            return PT;
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "en" -> EN;
            default -> PT;
        };
    }

    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }
}
