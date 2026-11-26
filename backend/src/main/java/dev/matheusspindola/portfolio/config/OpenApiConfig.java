package dev.matheusspindola.portfolio.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI portfolioOpenApi(@Value("${app.version:1.0.0}") String version) {
        return new OpenAPI().info(new Info()
                .title("Portfolio API")
                .version(version)
                .description("Health, project catalog and contact endpoints for the portfolio of Matheus Lopes Spíndola."));
    }
}
