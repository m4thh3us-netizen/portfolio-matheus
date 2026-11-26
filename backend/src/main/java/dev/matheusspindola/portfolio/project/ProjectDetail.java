package dev.matheusspindola.portfolio.project;

import java.util.List;

public record ProjectDetail(
        String id,
        String title,
        String summary,
        ProjectStatus status,
        String category,
        List<String> technologies,
        String liveUrl,
        String repoUrl,
        boolean verified,
        String description,
        List<String> highlights) {
}
