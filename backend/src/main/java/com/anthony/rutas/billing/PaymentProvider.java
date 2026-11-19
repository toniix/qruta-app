package com.anthony.rutas.billing;

import java.math.BigDecimal;
import java.util.UUID;

public interface PaymentProvider {

    ProviderCheckout createCheckout(UUID operatorId, String plan, String method, String providerReference);

    record ProviderCheckout(
            String providerReference,
            String checkoutUrl,
            BigDecimal amount,
            String currency) {
    }
}
