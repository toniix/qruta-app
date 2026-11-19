package com.anthony.rutas.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionResponse {
    private UUID subscriptionId;
    private String plan;
    private String status;
    private LocalDateTime startsAt;
    private LocalDateTime renewsAt;
    private LocalDateTime graceUntil;
    private List<SubscriptionPeriodResponse> periods;
}
