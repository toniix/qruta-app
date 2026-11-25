package com.anthony.rutas.billing;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BillingWebhookVerifierTest {

    private static final String SECRET = "test-webhook-secret";

    private BillingWebhookVerifier verifier;

    @BeforeEach
    void setUp() {
        BillingProperties properties = new BillingProperties();
        properties.setWebhookSecret(SECRET);
        verifier = new BillingWebhookVerifier(properties);
    }

    @Test
    void acceptsRawSignature() {
        String body = "{\"eventId\":\"evt-1\"}";

        assertDoesNotThrow(() -> verifier.verify(body, sign(body)));
    }

    @Test
    void acceptsPrefixedSignature() {
        String body = "{\"eventId\":\"evt-1\"}";

        assertDoesNotThrow(() -> verifier.verify(body, "sha256=" + sign(body)));
    }

    @Test
    void rejectsInvalidSignature() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> verifier.verify("{}", "bad-signature"));

        assertThat(exception.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void rejectsBlankSignature() {
        assertThrows(ResponseStatusException.class, () -> verifier.verify("{}", "  "));
    }

    @Test
    void failsClearlyWhenWebhookSecretIsMissing() {
        BillingProperties empty = new BillingProperties();
        BillingWebhookVerifier unconfigured = new BillingWebhookVerifier(empty);

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> unconfigured.verify("{}", "sha256=abc"));
        assertThat(ex.getMessage()).contains("not configured");
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
