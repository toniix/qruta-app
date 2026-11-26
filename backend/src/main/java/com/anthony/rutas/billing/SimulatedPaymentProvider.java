package com.anthony.rutas.billing;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SimulatedPaymentProvider implements PaymentProvider {

    private static final String CHECKOUT_BASE_URL = "https://pay.simulado.test/checkout/";

    private final BillingProperties properties;

    @Override
    public ProviderCheckout createCheckout(UUID operatorId, String plan, String method, String providerReference) {
        String token = BillingHmacSigner.sign(
                properties.getWebhookSecret(),
                providerReference,
                "sign simulated checkout");
        return new ProviderCheckout(
                providerReference,
                CHECKOUT_BASE_URL + token,
                new BigDecimal("49.00"),
                "PEN");
    }
}
