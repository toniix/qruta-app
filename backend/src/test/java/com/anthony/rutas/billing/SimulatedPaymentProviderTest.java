package com.anthony.rutas.billing;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SimulatedPaymentProviderTest {

    private final BillingProperties properties = new BillingProperties();
    private final SimulatedPaymentProvider provider = new SimulatedPaymentProvider(properties);

    @Test
    void createsDeterministicCheckoutForReference() {
        properties.setWebhookSecret("secret");
        String reference = "provider-ref-1";

        PaymentProvider.ProviderCheckout first =
                provider.createCheckout(UUID.randomUUID(), "PRO", "QR", reference);
        PaymentProvider.ProviderCheckout second =
                provider.createCheckout(UUID.randomUUID(), "PRO", "QR", reference);

        assertThat(first.providerReference()).isEqualTo(reference);
        assertThat(first.checkoutUrl()).startsWith("https://pay.simulado.test/checkout/");
        assertThat(first.checkoutUrl()).isEqualTo(second.checkoutUrl());
        assertThat(first.amount()).isEqualByComparingTo(BigDecimal.valueOf(49));
        assertThat(first.currency()).isEqualTo("PEN");
    }
}
