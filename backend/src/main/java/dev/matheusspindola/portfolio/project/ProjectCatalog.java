package dev.matheusspindola.portfolio.project;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Immutable, in-memory project catalog loaded once from {@code classpath:data/projects.json}.
 */
@Component
public class ProjectCatalog {

    static final String RESOURCE = "data/projects.json";

    private final List<Entry> entries;
    private final Map<String, Entry> byId;

    public ProjectCatalog(ObjectMapper objectMapper) {
        List<Entry> loaded = load(objectMapper);
        loaded.forEach(ProjectCatalog::validate);
        this.entries = loaded.stream().sorted(Comparator.comparingInt(Entry::order)).toList();
        this.byId = entries.stream().collect(Collectors.toUnmodifiableMap(Entry::id, Function.identity()));
    }

    public List<Entry> all() {
        return entries;
    }

    public Optional<Entry> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }

    private static List<Entry> load(ObjectMapper objectMapper) {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            return objectMapper.readValue(in, new TypeReference<List<Entry>>() { });
        } catch (IOException e) {
            throw new UncheckedIOException("Could not load " + RESOURCE, e);
        }
    }

    private static void validate(Entry entry) {
        if (entry.id() == null || entry.status() == null
                || entry.i18n().get("pt") == null || entry.i18n().get("en") == null) {
            throw new IllegalStateException("Invalid project entry in " + RESOURCE + ": " + entry.id());
        }
    }

    /** Raw catalog entry as stored in JSON. */
    public record Entry(
            String id,
            int order,
            ProjectStatus status,
            List<String> technologies,
            String liveUrl,
            String repoUrl,
            boolean verified,
            Map<String, Localized> i18n) {

        public Entry {
            technologies = technologies == null ? List.of() : List.copyOf(technologies);
            i18n = i18n == null ? Map.of() : Map.copyOf(i18n);
        }

        public Localized text(Lang lang) {
            Localized text = i18n.get(lang.code());
            return text != null ? text : i18n.get(Lang.PT.code());
        }
    }

    /** Language-specific fields. */
    public record Localized(
            String title,
            String category,
            String summary,
            String description,
            List<String> highlights) {

        public Localized {
            highlights = highlights == null ? List.of() : List.copyOf(highlights);
        }
    }
}
