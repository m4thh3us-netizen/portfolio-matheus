package dev.matheusspindola.portfolio.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class CorsTest {

    @Autowired
    MockMvc mvc;

    @Test
    void preflightFromConfiguredOriginIsAllowed() throws Exception {
        mvc.perform(options("/api/contact")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                .andExpect(header().string("Access-Control-Allow-Methods",
                        org.hamcrest.Matchers.containsString("POST")));
    }

    @Test
    void preflightFromOtherOriginIsRejected() throws Exception {
        mvc.perform(options("/api/contact")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void disallowedMethodIsRejectedInPreflight() throws Exception {
        mvc.perform(options("/api/projects")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "DELETE"))
                .andExpect(status().isForbidden());
    }

    @Test
    void simpleGetFromConfiguredOriginGetsCorsHeader() throws Exception {
        mvc.perform(get("/api/projects").header("Origin", "http://localhost:3000"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }
}
