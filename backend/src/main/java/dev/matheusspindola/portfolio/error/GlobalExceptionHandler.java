package dev.matheusspindola.portfolio.error;

import java.net.URI;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;

import dev.matheusspindola.portfolio.contact.ContactDeliveryException;
import dev.matheusspindola.portfolio.contact.RateLimitExceededException;
import dev.matheusspindola.portfolio.contact.SubmissionRejectedException;
import dev.matheusspindola.portfolio.project.ProjectNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.lang.Nullable;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Maps every error to an RFC 9457 {@code application/problem+json} body as defined in docs/api/contracts.md.
 * Framework exceptions (404 for unknown routes, 405, 415, ...) are handled by the base class.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ProjectNotFoundException.class)
    ResponseEntity<ProblemDetail> handleProjectNotFound(ProjectNotFoundException ex, HttpServletRequest request) {
        return problem(HttpStatus.NOT_FOUND, "Project not found", "The requested project does not exist.",
                request.getRequestURI());
    }

    @ExceptionHandler(SubmissionRejectedException.class)
    ResponseEntity<ProblemDetail> handleRejected(SubmissionRejectedException ex, HttpServletRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "Submission rejected", "The submission could not be accepted.",
                request.getRequestURI());
    }

    @ExceptionHandler(RateLimitExceededException.class)
    ResponseEntity<ProblemDetail> handleRateLimit(RateLimitExceededException ex, HttpServletRequest request) {
        ProblemDetail body = build(HttpStatus.TOO_MANY_REQUESTS, "Too many requests",
                "Too many submissions. Please try again later.", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.retryAfterSeconds()))
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler(ContactDeliveryException.class)
    ResponseEntity<ProblemDetail> handleDelivery(ContactDeliveryException ex, HttpServletRequest request) {
        log.warn("contact.delivery_unavailable reason=\"{}\"", ex.getMessage());
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "Contact delivery unavailable",
                "The message could not be delivered right now. Please try again later or use another contact channel.",
                request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "An unexpected error occurred.", request.getRequestURI());
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail body = build(HttpStatus.BAD_REQUEST, "Malformed request",
                "The request body is missing or is not valid JSON.", path(request));
        return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_PROBLEM_JSON).body(body);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        // Deterministic order (field, then message) when a field has several violations.
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().stream()
                .sorted(Comparator.comparing(FieldError::getField)
                        .thenComparing(e -> String.valueOf(e.getDefaultMessage())))
                .forEach(e -> errors.putIfAbsent(e.getField(), e.getDefaultMessage()));
        ResponseEntity<ProblemDetail> response = validationProblem(errors, path(request));
        return ResponseEntity.status(response.getStatusCode()).headers(response.getHeaders()).body(response.getBody());
    }

    /** Ensures framework-generated problems also carry {@code instance} and the problem+json content type. */
    @Override
    protected ResponseEntity<Object> createResponseEntity(@Nullable Object body, HttpHeaders headers,
            HttpStatusCode statusCode, WebRequest request) {
        if (body instanceof ProblemDetail problem && problem.getInstance() == null) {
            String path = path(request);
            if (path != null) {
                problem.setInstance(URI.create(path));
            }
        }
        return super.createResponseEntity(body, headers, statusCode, request);
    }

    private static ResponseEntity<ProblemDetail> validationProblem(Map<String, String> errors, String path) {
        ProblemDetail body = build(HttpStatus.BAD_REQUEST, "Validation failed",
                "One or more fields are invalid.", path);
        body.setProperty("errors", errors);
        return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_PROBLEM_JSON).body(body);
    }

    private static ResponseEntity<ProblemDetail> problem(HttpStatus status, String title, String detail, String path) {
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(build(status, title, detail, path));
    }

    private static ProblemDetail build(HttpStatus status, String title, String detail, @Nullable String path) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        if (path != null) {
            problem.setInstance(URI.create(path));
        }
        return problem;
    }

    @Nullable
    private static String path(WebRequest request) {
        return request instanceof ServletWebRequest servlet ? servlet.getRequest().getRequestURI() : null;
    }
}
