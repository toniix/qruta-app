package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DirectionStopResponse {
    private UUID id;
    private String name;
    private Coordinates location;
    private String reference;
    private String address;
    private boolean accessible;
    private Integer stopOrder;
    private Double distanceFromStart;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Coordinates {
        private Double latitude;
        private Double longitude;
    }
}