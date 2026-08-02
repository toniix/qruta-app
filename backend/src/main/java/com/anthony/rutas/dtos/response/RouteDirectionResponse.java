package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteDirectionResponse {
    private UUID id;
    private String direction;
    private String originName;
    private String destinationName;
    private Double totalDistanceKm;
    private Integer estimatedMinutes;
    private List<StopResponse> stops;
    private List<RoutePointResponse> routePoints;
}
