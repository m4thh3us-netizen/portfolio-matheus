package dev.matheusspindola.portfolio.config;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * Resolves the client IP used for rate limiting (ADR-002 §2).
 * <ol>
 *   <li>If {@code app.client-ip.header} is set (e.g. {@code Fly-Client-IP}) and carries a valid IP literal, it wins.</li>
 *   <li>Else, if {@code app.client-ip.trusted-hops = N > 0}, the N-th {@code X-Forwarded-For} entry counted from the
 *       <b>right</b> is used (proxies append to the right; the left-most entries are client-controlled).</li>
 *   <li>Else (or when the value is missing / not an IP literal) {@link HttpServletRequest#getRemoteAddr()}.</li>
 * </ol>
 * {@link #resolveKey} additionally collapses IPv6 addresses to their /64 prefix, since one client normally controls a whole /64.
 */
@Component
public class ClientIpResolver {

    private static final Logger log = LoggerFactory.getLogger(ClientIpResolver.class);

    /** Cheap pre-filter: only hex digits, dots and colons. Rejects hostnames with other letters, ports in brackets, scopes. */
    private static final Pattern IP_CHARS = Pattern.compile("^[0-9A-Fa-f:.]{2,45}$");
    private static final Pattern IPV4 = Pattern.compile(
            "^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$");
    private static final int MAX_FORWARDED_ENTRIES = 32;

    private final int trustedHops;
    @Nullable
    private final String header;
    private final AtomicBoolean debugLogged = new AtomicBoolean();

    @Autowired
    public ClientIpResolver(@Value("${app.client-ip.trusted-hops:0}") int trustedHops,
                            @Value("${app.client-ip.header:}") @Nullable String header,
                            @Value("${app.trust-proxy:false}") boolean legacyTrustProxy) {
        if (trustedHops < 0) {
            throw new IllegalArgumentException("app.client-ip.trusted-hops must be >= 0");
        }
        if (legacyTrustProxy && trustedHops == 0) {
            log.warn("APP_TRUST_PROXY / app.trust-proxy is deprecated and will be removed; treating it as "
                    + "APP_CLIENT_IP_TRUSTED_HOPS=1 (right-most X-Forwarded-For entry). Set APP_CLIENT_IP_TRUSTED_HOPS instead.");
            trustedHops = 1;
        } else if (legacyTrustProxy) {
            log.warn("APP_TRUST_PROXY is deprecated and ignored because APP_CLIENT_IP_TRUSTED_HOPS={} is set.", trustedHops);
        }
        this.trustedHops = trustedHops;
        this.header = header == null || header.isBlank() ? null : header.strip();
        log.info("Client IP resolution: header={} trustedHops={} (fallback remoteAddr)",
                this.header == null ? "<none>" : this.header, this.trustedHops);
    }

    public ClientIpResolver(int trustedHops, @Nullable String header) {
        this(trustedHops, header, false);
    }

    /** @return the client IP literal (normalized), or the raw {@code remoteAddr} as last resort */
    public String resolve(HttpServletRequest request) {
        if (debugLogged.compareAndSet(false, true) && log.isDebugEnabled()) {
            log.debug("client-ip.calibration remoteAddr={} xff=\"{}\" header({})=\"{}\"",
                    request.getRemoteAddr(), String.join(" | ", forwardedEntries(request)),
                    header, header == null ? "" : request.getHeader(header));
        }
        if (header != null) {
            InetAddress fromHeader = parseLiteral(request.getHeader(header));
            if (fromHeader != null) {
                return fromHeader.getHostAddress();
            }
        }
        if (trustedHops > 0) {
            List<String> entries = forwardedEntries(request);
            int index = entries.size() - trustedHops;
            if (index >= 0) {
                InetAddress forwarded = parseLiteral(entries.get(index));
                if (forwarded != null) {
                    return forwarded.getHostAddress();
                }
            }
        }
        String remote = request.getRemoteAddr();
        InetAddress parsed = parseLiteral(remote);
        if (parsed != null) {
            return parsed.getHostAddress();
        }
        return remote == null ? "unknown" : remote;
    }

    /** Rate-limit key: the IPv4 address, or the /64 prefix of an IPv6 address. */
    public String resolveKey(HttpServletRequest request) {
        return keyFor(resolve(request));
    }

    static String keyFor(String ip) {
        InetAddress address = parseLiteral(ip);
        if (address instanceof Inet6Address) {
            byte[] bytes = address.getAddress();
            StringBuilder sb = new StringBuilder(24);
            for (int i = 0; i < 8; i += 2) {
                sb.append(Integer.toHexString(((bytes[i] & 0xff) << 8) | (bytes[i + 1] & 0xff))).append(':');
            }
            return sb.append(":/64").toString();
        }
        return address == null ? ip : address.getHostAddress();
    }

    private static List<String> forwardedEntries(HttpServletRequest request) {
        List<String> entries = new ArrayList<>();
        Enumeration<String> headers = request.getHeaders("X-Forwarded-For");
        while (headers != null && headers.hasMoreElements()) {
            for (String part : headers.nextElement().split(",")) {
                entries.add(part.trim());
            }
        }
        // Only the right-most entries can ever be trusted; cap the work done on a hostile header.
        return entries.size() > MAX_FORWARDED_ENTRIES
                ? entries.subList(entries.size() - MAX_FORWARDED_ENTRIES, entries.size())
                : entries;
    }

    /**
     * Parses an IPv4/IPv6 literal without ever triggering a DNS lookup.
     *
     * @return the address, or {@code null} if {@code value} is not an IP literal
     */
    @Nullable
    static InetAddress parseLiteral(@Nullable String value) {
        if (value == null) {
            return null;
        }
        String candidate = value.trim();
        if (!IP_CHARS.matcher(candidate).matches()) {
            return null;
        }
        boolean v6 = candidate.indexOf(':') >= 0;
        if (!v6 && !IPV4.matcher(candidate).matches()) {
            return null; // e.g. "cafe.babe" would otherwise be resolved as a hostname
        }
        try {
            // Contains ':' → parsed as IPv6 literal (never resolved); otherwise a strict dotted quad.
            InetAddress address = InetAddress.getByName(candidate.toLowerCase(Locale.ROOT));
            return address instanceof Inet4Address || address instanceof Inet6Address ? address : null;
        } catch (UnknownHostException | SecurityException e) {
            return null;
        }
    }
}
