package dev.matheusspindola.portfolio.contact;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rate limiting happens earlier, in {@link ContactRateLimitInterceptor}, so every attempt counts. */
@RestController
@RequestMapping("/api/contact")
@Tag(name = "Contact")
public class ContactController {

    private final ContactService service;

    public ContactController(ContactService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "Submit a contact message")
    @ApiResponse(responseCode = "202", description = "Message delivered to the configured sink")
    @ApiResponse(responseCode = "400", description = "Validation failed, malformed JSON or submission rejected")
    @ApiResponse(responseCode = "413", description = "Body larger than app.max-body-bytes")
    @ApiResponse(responseCode = "429", description = "Too many attempts from this client (Retry-After header)")
    @ApiResponse(responseCode = "503", description = "Contact delivery unavailable")
    public ResponseEntity<ContactResponse> submit(@Valid @RequestBody ContactRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(service.submit(request));
    }
}
