package dev.matheusspindola.portfolio.contact;

import java.util.regex.Pattern;

/** Helpers that make user-supplied text safe to embed in a single log line (no log forging). */
final class LogSanitizer {

    private static final Pattern UNSAFE = Pattern.compile("[\\p{Cntrl}\\p{Zl}\\p{Zp}\"]");

    private LogSanitizer() {
    }

    /** Replaces control characters, Unicode line/paragraph separators and quotes with {@code _}. */
    static String sanitize(String value) {
        return value == null ? "" : UNSAFE.matcher(value).replaceAll("_");
    }

    /**
     * Escapes free text (subject/message) so it stays on one line but remains readable:
     * CR/LF/TAB become backslash escapes, quotes and backslashes are escaped, other control characters and
     * U+2028/U+2029 become backslash-u escapes. The input is truncated to {@code maxChars} first.
     */
    static String escape(String value, int maxChars) {
        if (value == null) {
            return "";
        }
        boolean truncated = value.length() > maxChars;
        String input = truncated ? value.substring(0, maxChars) : value;
        StringBuilder sb = new StringBuilder(input.length() + 16);
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            switch (c) {
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                default -> {
                    if (Character.isISOControl(c) || c == 0x2028 || c == 0x2029) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        if (truncated) {
            sb.append("...[truncated]");
        }
        return sb.toString();
    }

    static String truncate(String value, int maxChars) {
        return value.length() > maxChars ? value.substring(0, maxChars) + "..." : value;
    }

    static String maskEmail(String email) {
        if (email == null) {
            return "";
        }
        int at = email.lastIndexOf('@');
        if (at <= 0) {
            return "***";
        }
        return sanitize(email.charAt(0) + "***" + email.substring(at));
    }
}
