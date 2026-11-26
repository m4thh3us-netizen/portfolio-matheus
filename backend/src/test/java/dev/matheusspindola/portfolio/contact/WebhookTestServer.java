package dev.matheusspindola.portfolio.contact;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;

import com.sun.net.httpserver.HttpServer;

/** Loopback-only HTTP server standing in for a webhook receiver (no external network in tests). */
final class WebhookTestServer implements AutoCloseable {

    record Received(String method, String path, String contentType, String authorization, String body) {
    }

    private final HttpServer server;
    final List<Received> received = new CopyOnWriteArrayList<>();
    volatile int status = 204;
    volatile Duration delay = Duration.ZERO;

    WebhookTestServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.setExecutor(Executors.newCachedThreadPool());
        server.createContext("/", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            received.add(new Received(exchange.getRequestMethod(), exchange.getRequestURI().getPath(),
                    exchange.getRequestHeaders().getFirst("Content-Type"),
                    exchange.getRequestHeaders().getFirst("Authorization"), body));
            try {
                Thread.sleep(delay.toMillis());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            exchange.sendResponseHeaders(status, -1);
            exchange.close();
        });
        server.start();
    }

    URI uri(String path) {
        return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + path);
    }

    void reset() {
        received.clear();
        status = 204;
        delay = Duration.ZERO;
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
