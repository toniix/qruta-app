package com.anthony.rutas.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingCheckoutResponse {
    private UUID subscriptionId;
    private UUID periodId;
    private String providerReference;
    private String checkoutUrl;
    private String plan;
    private String method;
    private String status;
    private BigDecimal amount;
    private String currency;
}
