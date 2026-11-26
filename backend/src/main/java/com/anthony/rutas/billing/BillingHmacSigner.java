package com.anthony.rutas.billing;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

/**
 * Shared HMAC-SHA256 signer for billing webhook verification and simulated checkouts.
 */
final class BillingHmacSigner {

    private BillingHmacSigner() {
    }

    static String sign(String secret, String value, String errorContext) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("Billing webhook secret is not configured");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to " + errorContext, exception);
        }
    }
}
