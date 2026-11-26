package dev.matheusspindola.portfolio.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpResolverTest {

    private static MockHttpServletRequest request(String... forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.10");
        for (String value : forwardedFor) {
            request.addHeader("X-Forwarded-For", value);
        }
        return request;
    }

    @Test
    void usesRemoteAddrWhenNoHopsTrusted() {
        assertThat(new ClientIpResolver(0, null).resolve(request("203.0.113.5"))).isEqualTo("192.0.2.10");
    }

    @Test
    void oneHopUsesRightMostEntryNotTheClientControlledLeftMost() {
        assertThat(new ClientIpResolver(1, null).resolve(request("evil, 203.0.113.5"))).isEqualTo("203.0.113.5");
        assertThat(new ClientIpResolver(1, null).resolve(request("198.51.100.7, 203.0.113.5"))).isEqualTo("203.0.113.5");
    }

    @Test
    void twoHopsUseSecondFromTheRight() {
        assertThat(new ClientIpResolver(2, null).resolve(request("1.1.1.1, 203.0.113.5, 10.0.0.1")))
                .isEqualTo("203.0.113.5");
    }

    @Test
    void multipleForwardedHeadersAreConcatenatedInOrder() {
        assertThat(new ClientIpResolver(1, null).resolve(request("1.1.1.1", "203.0.113.5"))).isEqualTo("203.0.113.5");
    }

    @Test
    void fewerEntriesThanHopsFallsBackToRemoteAddr() {
        assertThat(new ClientIpResolver(2, null).resolve(request("203.0.113.5"))).isEqualTo("192.0.2.10");
        assertThat(new ClientIpResolver(1, null).resolve(request())).isEqualTo("192.0.2.10");
    }

    @Test
    void nonIpValuesFallBackToRemoteAddrWithoutDnsLookup() {
        ClientIpResolver resolver = new ClientIpResolver(1, null);
        assertThat(resolver.resolve(request("1.1.1.1, not-an-ip"))).isEqualTo("192.0.2.10");
        assertThat(resolver.resolve(request("1.1.1.1, cafe.babe"))).isEqualTo("192.0.2.10"); // hex-only hostname
        assertThat(resolver.resolve(request("1.1.1.1, 999.1.1.1"))).isEqualTo("192.0.2.10");
        assertThat(resolver.resolve(request("1.1.1.1, 203.0.113.5:443"))).isEqualTo("192.0.2.10");
        assertThat(resolver.resolve(request("1.1.1.1, " + "a".repeat(100)))).isEqualTo("192.0.2.10");
    }

    @Test
    void platformHeaderTakesPrecedence() {
        ClientIpResolver resolver = new ClientIpResolver(1, "Fly-Client-IP");
        MockHttpServletRequest request = request("1.1.1.1, 203.0.113.5");
        request.addHeader("Fly-Client-IP", "198.51.100.20");
        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.20");
    }

    @Test
    void invalidPlatformHeaderFallsBackToHopsThenRemoteAddr() {
        MockHttpServletRequest request = request("1.1.1.1, 203.0.113.5");
        request.addHeader("Fly-Client-IP", "garbage");
        assertThat(new ClientIpResolver(1, "Fly-Client-IP").resolve(request)).isEqualTo("203.0.113.5");
        assertThat(new ClientIpResolver(0, "Fly-Client-IP").resolve(request)).isEqualTo("192.0.2.10");
    }

    @Test
    void legacyTrustProxyIsAliasForOneHop() {
        assertThat(new ClientIpResolver(0, null, true).resolve(request("evil, 203.0.113.5"))).isEqualTo("203.0.113.5");
    }

    @Test
    void negativeHopsAreRejected() {
        assertThatThrownBy(() -> new ClientIpResolver(-1, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void ipv6KeysCollapseToSlash64() {
        ClientIpResolver resolver = new ClientIpResolver(1, null);
        String a = resolver.resolveKey(request("2001:db8:abcd:12:1111:2222:3333:4444"));
        String b = resolver.resolveKey(request("2001:DB8:ABCD:12::ffff"));
        String other = resolver.resolveKey(request("2001:db8:abcd:13::1"));
        assertThat(a).isEqualTo("2001:db8:abcd:12::/64").isEqualTo(b);
        assertThat(other).isNotEqualTo(a);
    }

    @Test
    void ipv4KeyIsTheFullAddress() {
        assertThat(new ClientIpResolver(1, null).resolveKey(request("203.0.113.5"))).isEqualTo("203.0.113.5");
        assertThat(ClientIpResolver.keyFor("::ffff:203.0.113.5")).isEqualTo("203.0.113.5");
    }
}
