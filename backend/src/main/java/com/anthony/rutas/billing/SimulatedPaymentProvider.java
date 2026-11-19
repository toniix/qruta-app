package com.anthony.rutas.billing;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SimulatedPaymentProvider implements PaymentProvider {

    private static final String CHECKOUT_BASE_URL = "https://pay.simulado.test/checkout/";

    private final BillingProperties properties;

    @Override
    public ProviderCheckout createCheckout(UUID operatorId, String plan, String method, String providerReference) {
        String token = sign(providerReference);
        return new ProviderCheckout(
                providerReference,
                CHECKOUT_BASE_URL + token,
                new BigDecimal("49.00"),
                "PEN");
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            byte[] secret = properties.getWebhookSecret().getBytes(StandardCharsets.UTF_8);
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to sign simulated checkout", exception);
        }
    }
}
