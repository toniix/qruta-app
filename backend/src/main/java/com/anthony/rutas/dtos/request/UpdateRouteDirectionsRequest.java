package com.anthony.rutas.dtos.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.util.List;
import java.util.Objects;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRouteDirectionsRequest {
    @Valid
    @NotEmpty(message = "Directions cannot be empty")
    private List<@NotNull(message = "Direction item cannot be null") @Valid DirectionUpdateRequest> directions;

    @AssertTrue(message = "A route cannot have two directions with the same value")
    @JsonIgnore
    public boolean isDirectionValuesUnique() {
        if (directions == null) return true;
        return RouteRequestValidation.uniqueDirections(
                directions.stream()
                        .filter(Objects::nonNull)
                        .map(DirectionUpdateRequest::getDirection)
                        .toList());
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DirectionUpdateRequest {
        private String id;
        @NotBlank(message = "Direction is required")
        @Pattern(regexp = "IDA|VUELTA", message = "Direction must be IDA or VUELTA")
        private String direction;
        private String originName;
        private String destinationName;
        private Double totalDistanceKm;
        private Integer estimatedMinutes;
        @Valid
        private List<@NotNull(message = "Stop item cannot be null") @Valid StopUpdateRequest> stops;
        /**
         * Authoritative geometry for this direction.
         * <ul>
         *   <li>{@code null} / field absent: keep the stored points unchanged.</li>
         *   <li>empty list: remove all stored points.</li>
         *   <li>non-empty list: replace the stored points exactly as submitted.</li>
         * </ul>
         */
        @Valid
        private List<@NotNull(message = "Route point item cannot be null") @Valid PointUpdateRequest> routePoints;

        @AssertTrue(message = "Point order must be unique within a direction")
        @JsonIgnore
        public boolean isPointOrderUnique() {
            return RouteRequestValidation.uniquePointOrders(routePoints);
        }

        @AssertTrue(message = "Stop order must be unique within a direction")
        @JsonIgnore
        public boolean isStopOrderUnique() {
            return RouteRequestValidation.uniqueStopOrders(stops);
        }

        @AssertTrue(message = "A stop cannot appear twice in the same direction")
        @JsonIgnore
        public boolean isStopIdUnique() {
            return RouteRequestValidation.uniqueStopIds(stops);
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StopUpdateRequest implements RouteRequestValidation.StopId, RouteRequestValidation.StopOrder {
        private String id;
        @NotBlank(message = "Stop ID is required")
        private String stopId;
        @NotNull(message = "Stop order is required")
        @Positive(message = "Stop order must be positive")
        private Integer stopOrder;
        private Double distanceFromStart;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PointUpdateRequest implements RouteRequestValidation.PointOrder {
        private String id;
        @NotNull(message = "Point order is required")
        @Positive(message = "Point order must be positive")
        private Integer pointOrder;
        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90", message = "Latitude is out of range")
        @DecimalMax(value = "90", message = "Latitude is out of range")
        private Double latitude;
        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180", message = "Longitude is out of range")
        @DecimalMax(value = "180", message = "Longitude is out of range")
        private Double longitude;
    }
}
