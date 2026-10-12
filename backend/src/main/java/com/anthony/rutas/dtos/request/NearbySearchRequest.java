package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NearbySearchRequest {
    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90", message = "Latitude must be between -90 and 90")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180", message = "Longitude must be between -180 and 180")
    private Double longitude;

    @DecimalMin(value = "0", inclusive = false, message = "Radius must be greater than 0")
    @DecimalMax(value = "100000", message = "Radius must not exceed 100000 meters")
    private Double radiusMeters = 1000.0;
}
