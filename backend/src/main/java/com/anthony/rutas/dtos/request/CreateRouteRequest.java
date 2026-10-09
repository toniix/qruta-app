package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRouteRequest {
    @NotBlank(message = "Transport line ID is required")
    private String transportLineId;

    @NotBlank(message = "Code is required")
    private String code;

    @NotBlank(message = "Name is required")
    private String name;

    private String color;
    private String description;
    private String fare;
    private String schedule;
    private String frequency;
    private String status;

    @Min(value = 0, message = "Popularity score cannot be negative")
    private Integer popularityScore;

    private List<RouteDirectionRequest> directions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RouteDirectionRequest {
        @NotBlank(message = "Direction is required")
        private String direction;
        private String originName;
        private String destinationName;
        private Double totalDistanceKm;
        private Integer estimatedMinutes;
        private List<RouteStopItemRequest> stops;
        private List<RoutePointItemRequest> routePoints;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RouteStopItemRequest {
        @NotBlank(message = "Stop ID is required")
        private String stopId;
        @NotNull(message = "Stop order is required")
        private Integer stopOrder;
        private Double distanceFromStart;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoutePointItemRequest {
        @NotNull(message = "Point order is required")
        private Integer pointOrder;
        @NotNull(message = "Latitude is required")
        private Double latitude;
        @NotNull(message = "Longitude is required")
        private Double longitude;
    }
}
