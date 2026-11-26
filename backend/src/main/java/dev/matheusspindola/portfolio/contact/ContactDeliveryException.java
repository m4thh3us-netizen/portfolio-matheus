package dev.matheusspindola.portfolio.contact;

/** The message could not be handed to a delivery channel. Rendered as 503; never results in a 202. */
public class ContactDeliveryException extends RuntimeException {

    public ContactDeliveryException(String message) {
        super(message);
    }

    public ContactDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
