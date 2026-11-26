package dev.matheusspindola.portfolio.project;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

/**
 * Intentionally pins the catalog content (count, verified flags, live URLs): it mirrors the confirmed facts in
 * docs/content/profile.md. Update it together with src/main/resources/data/projects.json.
 */
class ProjectCatalogTest {

    private final ProjectCatalog catalog = new ProjectCatalog(new ObjectMapper());

    @Test
    void loadsAllProjectsWithBothLanguages() {
        assertThat(catalog.all()).hasSize(7);
        assertThat(catalog.all()).allSatisfy(entry -> {
            for (Lang lang : Lang.values()) {
                ProjectCatalog.Localized text = entry.i18n().get(lang.code());
                assertThat(text).as(entry.id() + "/" + lang).isNotNull();
                assertThat(text.title()).isNotBlank();
                assertThat(text.summary()).isNotBlank();
                assertThat(text.description()).isNotBlank();
                assertThat(text.category()).isNotBlank();
            }
            assertThat(entry.repoUrl()).isNull();
        });
    }

    @Test
    void onlyPortfolioIsVerifiedAndOnlyMfyHasLiveUrl() {
        assertThat(catalog.all()).filteredOn(ProjectCatalog.Entry::verified)
                .extracting(ProjectCatalog.Entry::id).containsExactly("portfolio");
        assertThat(catalog.all()).filteredOn(e -> e.liveUrl() != null)
                .extracting(ProjectCatalog.Entry::id).containsExactly("mfy");
    }
}
