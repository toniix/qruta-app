package com.anthony.rutas.billing;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
@RequiredArgsConstructor
public class BillingWebhookVerifier {

    private static final String SIGNATURE_PREFIX = "sha256=";

    private final BillingProperties properties;

    public void verify(String rawBody, String signature) {
        if (signature == null || signature.isBlank()) {
            throw unauthorized();
        }
        String normalized = signature.startsWith(SIGNATURE_PREFIX)
                ? signature
                : SIGNATURE_PREFIX + signature;
        String expected = SIGNATURE_PREFIX + BillingHmacSigner.sign(
                properties.getWebhookSecret(),
                rawBody == null ? "" : rawBody,
                "verify webhook signature");
        boolean valid = MessageDigest.isEqual(
                normalized.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
        if (!valid) {
            throw unauthorized();
        }
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid billing webhook signature");
    }
}
