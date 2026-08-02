package com.anthony.rutas.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRouteDirectionsRequest {
    @Valid
    @NotEmpty(message = "Directions cannot be empty")
    private List<@Valid DirectionUpdateRequest> directions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DirectionUpdateRequest {
        private String id;
        private String direction;
        private String originName;
        private String destinationName;
        private Double totalDistanceKm;
        private Integer estimatedMinutes;
        private List<@Valid StopUpdateRequest> stops;
        private List<@Valid PointUpdateRequest> routePoints;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StopUpdateRequest {
        private String id;
        private String stopId;
        private Integer stopOrder;
        private Double distanceFromStart;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PointUpdateRequest {
        private String id;
        private Integer pointOrder;
        private Double latitude;
        private Double longitude;
    }
}
