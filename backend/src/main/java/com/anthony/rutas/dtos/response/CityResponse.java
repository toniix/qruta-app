package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CityResponse {
    private UUID id;
    private String name;
    private String department;
    private String country;
    private Double latitude;
    private Double longitude;
    private Double radiusKm;
}
