package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

/**
 * Lightweight summary of a Route for the popular routes section
 * ({@code GET /api/routes/popular}).
 * Contains only the fields required to render a route card on the home screen.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PopularRouteResponse {
    private UUID id;
    private String code;
    private String name;
    private String category;
    private String color;
    private Integer totalStops;
    private Integer popularityScore;
    private UUID cityId;
    private String cityName;
}