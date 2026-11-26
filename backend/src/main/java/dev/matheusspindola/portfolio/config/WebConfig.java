package dev.matheusspindola.portfolio.config;

import java.time.Clock;
import java.util.List;

import dev.matheusspindola.portfolio.contact.ContactRateLimitInterceptor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final ContactRateLimitInterceptor contactRateLimitInterceptor;

    public WebConfig(ContactRateLimitInterceptor contactRateLimitInterceptor) {
        this.contactRateLimitInterceptor = contactRateLimitInterceptor;
    }

    /** Rate limit runs before argument resolution, so malformed / invalid / 415 attempts also count (ADR-002 §4). */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(contactRateLimitInterceptor).addPathPatterns("/api/contact");
    }

    /**
     * Security headers (QA-03) as the very first servlet filter: they are set before anything else runs, so even a
     * CORS rejection (403), a 413 from {@link RequestSizeLimitFilter} or an error response carries them.
     */
    @Bean
    static FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilter() {
        FilterRegistrationBean<SecurityHeadersFilter> registration =
                new FilterRegistrationBean<>(new SecurityHeadersFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.setName("securityHeadersFilter");
        return registration;
    }

    /**
     * CORS right after the security headers and before every other filter (ADR-002 §5), so responses written directly
     * by later filters (e.g. 413 from {@link RequestSizeLimitFilter}) still carry {@code Access-Control-Allow-Origin}.
     */
    @Bean
    static FilterRegistrationBean<CorsFilter> corsFilter(CorsProperties corsProperties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(corsProperties.allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        config.setAllowedHeaders(List.of(HttpHeaders.CONTENT_TYPE, HttpHeaders.ACCEPT, HttpHeaders.ACCEPT_LANGUAGE));
        config.setExposedHeaders(List.of(HttpHeaders.RETRY_AFTER));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);

        FilterRegistrationBean<CorsFilter> registration = new FilterRegistrationBean<>(new CorsFilter(source));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        registration.setName("corsFilter");
        return registration;
    }

    @Bean
    static Clock clock() {
        return Clock.systemUTC();
    }
}
