package com.anthony.rutas.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

/**
 * Batch ingestion payload. Max {@value #MAX_EVENTS} events per request; the raw JSON body
 * is also capped at 64 KB in the controller so a huge batch cannot be smuggled past the
 * list-size check.
 */
@Getter
@Setter
public class AnalyticsEventBatchRequest {

    public static final int MAX_EVENTS = 50;

    @NotNull
    @Size(max = MAX_EVENTS, message = "A batch may contain at most " + MAX_EVENTS + " events")
    @Valid
    private List<EventItem> events;

    @Getter
    @Setter
    public static class EventItem {

        @NotBlank(message = "category is required")
        @ValidEventCategory
        private String category;

        private String routeId;
        private String stopId;
        private String transportLineId;
        private String cityId;

        /** Raw device id sent by the client; the server hashes it before storing. */
        @NotBlank(message = "deviceId is required")
        private String deviceId;

        /** Campaign code carried by a physical QR code. */
        private String campaign;

        /** Optional client-side occurrence time; defaults to server receipt time. */
        private Instant recordedAt;
    }
}
