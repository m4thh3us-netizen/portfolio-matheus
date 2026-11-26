package dev.matheusspindola.portfolio.contact;

/** Thrown when an anti-spam check fails. Deliberately carries no hint of which check failed. */
public class SubmissionRejectedException extends RuntimeException {

    public SubmissionRejectedException() {
        super("Submission rejected");
    }
}
