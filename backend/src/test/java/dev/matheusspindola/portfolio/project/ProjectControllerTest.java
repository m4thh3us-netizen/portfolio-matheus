package dev.matheusspindola.portfolio.project;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ProjectControllerTest {

    @Autowired
    MockMvc mvc;

    @Test
    void listDefaultsToPortugueseAndIsOrdered() throws Exception {
        mvc.perform(get("/api/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(7)))
                .andExpect(jsonPath("$[*].id").value(contains("mfy", "ecommerce-management", "tutoring-platform",
                        "projeto-horizonte", "oracle-modeling", "nfe-integration", "portfolio")))
                .andExpect(jsonPath("$[0].title").value("MFY — Finanças Pessoais"))
                .andExpect(jsonPath("$[0].status").value("PUBLISHED"))
                .andExpect(jsonPath("$[0].liveUrl").value("https://mfy-xi.vercel.app/"))
                .andExpect(jsonPath("$[0].repoUrl").value(nullValue()))
                .andExpect(jsonPath("$[0].technologies", hasSize(0)))
                .andExpect(jsonPath("$[0].verified").value(false))
                .andExpect(jsonPath("$[0].description").doesNotExist())
                .andExpect(jsonPath("$[6].verified").value(true));
    }

    @Test
    void listInEnglish() throws Exception {
        mvc.perform(get("/api/projects").param("lang", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("MFY — Personal Finances"))
                .andExpect(jsonPath("$[0].category").value("Web App"));
    }

    @Test
    void unknownLangFallsBackToPortuguese() throws Exception {
        mvc.perform(get("/api/projects").param("lang", "fr"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("MFY — Finanças Pessoais"));
    }

    @Test
    void detailReturnsDescriptionAndHighlights() throws Exception {
        mvc.perform(get("/api/projects/oracle-modeling").param("lang", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("oracle-modeling"))
                .andExpect(jsonPath("$.status").value("STUDY"))
                .andExpect(jsonPath("$.technologies").value(contains("SQL", "Oracle Database")))
                .andExpect(jsonPath("$.description").isString())
                .andExpect(jsonPath("$.highlights").isArray());
    }

    @Test
    void unknownProjectReturns404Problem() throws Exception {
        mvc.perform(get("/api/projects/nope"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.type").value("about:blank"))
                .andExpect(jsonPath("$.title").value("Project not found"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.instance").value("/api/projects/nope"))
                .andExpect(jsonPath("$.errors").doesNotExist());
    }

    @Test
    void unknownRouteReturns404Problem() throws Exception {
        mvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404));
    }
}
