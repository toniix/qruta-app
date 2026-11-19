package com.anthony.rutas.billing;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

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
        String expected = SIGNATURE_PREFIX + sign(rawBody == null ? "" : rawBody);
        boolean valid = MessageDigest.isEqual(
                normalized.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
        if (!valid) {
            throw unauthorized();
        }
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            byte[] secret = properties.getWebhookSecret().getBytes(StandardCharsets.UTF_8);
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to verify webhook signature", exception);
        }
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid billing webhook signature");
    }
}
