package com.anthony.rutas.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPeriodResponse {
    private UUID id;
    private UUID operatorId;
    private LocalDateTime fromAt;
    private LocalDateTime toAt;
    private String amount;
    private String currency;
    private String method;
    private String status;
    private String providerReference;
}
