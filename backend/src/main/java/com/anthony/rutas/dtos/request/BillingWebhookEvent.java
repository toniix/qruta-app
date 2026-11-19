package com.anthony.rutas.dtos.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingWebhookEvent {

    @JsonAlias("event_id")
    private String eventId;

    private String type;

    @JsonAlias("provider_reference")
    private String providerReference;

    private Map<String, Object> data;
}
