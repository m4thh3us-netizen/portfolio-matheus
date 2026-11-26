package dev.matheusspindola.portfolio.project;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ProjectService {

    private final ProjectCatalog catalog;

    public ProjectService(ProjectCatalog catalog) {
        this.catalog = catalog;
    }

    public List<ProjectSummary> list(Lang lang) {
        return catalog.all().stream().map(entry -> toSummary(entry, lang)).toList();
    }

    public ProjectDetail get(String id, Lang lang) {
        ProjectCatalog.Entry entry = catalog.findById(id).orElseThrow(() -> new ProjectNotFoundException(id));
        ProjectCatalog.Localized text = entry.text(lang);
        return new ProjectDetail(entry.id(), text.title(), text.summary(), entry.status(), text.category(),
                entry.technologies(), entry.liveUrl(), entry.repoUrl(), entry.verified(),
                text.description(), text.highlights());
    }

    private static ProjectSummary toSummary(ProjectCatalog.Entry entry, Lang lang) {
        ProjectCatalog.Localized text = entry.text(lang);
        return new ProjectSummary(entry.id(), text.title(), text.summary(), entry.status(), text.category(),
                entry.technologies(), entry.liveUrl(), entry.repoUrl(), entry.verified());
    }
}
