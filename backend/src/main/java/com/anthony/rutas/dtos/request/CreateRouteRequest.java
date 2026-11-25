package com.anthony.rutas.dtos.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
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

    private String category;

    private String color;
    private String description;
    private String fare;
    private String schedule;
    private String frequency;
    private String status;

    @Min(value = 0, message = "Popularity score cannot be negative")
    private Integer popularityScore;

    @Valid
    private List<@Valid RouteDirectionRequest> directions;

    @AssertTrue(message = "A route cannot have two directions with the same value")
    @JsonIgnore
    public boolean isDirectionValuesUnique() {
        if (directions == null) return true;
        return RouteRequestValidation.uniqueDirections(
                directions.stream().map(RouteDirectionRequest::getDirection).toList());
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RouteDirectionRequest {
        @NotBlank(message = "Direction is required")
        @Pattern(regexp = "IDA|VUELTA", message = "Direction must be IDA or VUELTA")
        private String direction;
        private String originName;
        private String destinationName;
        private Double totalDistanceKm;
        private Integer estimatedMinutes;
        @Valid
        private List<@Valid RouteStopItemRequest> stops;
        /**
         * Authoritative ordered geometry for this direction. The admin wizard may
         * seed it from the selected stops, but the server never derives it from
         * them. An empty list creates a direction with no points.
         */
        @Valid
        private List<@Valid RoutePointItemRequest> routePoints;

        @AssertTrue(message = "Point order must be unique within a direction")
        @JsonIgnore
        public boolean isPointOrderUnique() {
            return RouteRequestValidation.uniquePointOrders(routePoints);
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
    public static class RouteStopItemRequest implements RouteRequestValidation.StopId {
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
    public static class RoutePointItemRequest implements RouteRequestValidation.PointOrder {
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
