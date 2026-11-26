package dev.matheusspindola.portfolio.project;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
@Tag(name = "Projects")
public class ProjectController {

    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List projects ordered by display order")
    public List<ProjectSummary> list(
            @Parameter(description = "pt (default) or en; unknown values fall back to pt")
            @RequestParam(name = "lang", required = false) String lang) {
        return service.list(Lang.from(lang));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get project detail")
    public ProjectDetail get(
            @PathVariable String id,
            @Parameter(description = "pt (default) or en; unknown values fall back to pt")
            @RequestParam(name = "lang", required = false) String lang) {
        return service.get(id, Lang.from(lang));
    }
}
