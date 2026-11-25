package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateStopRequest {
    @NotBlank(message = "City ID is required")
    private String cityId;

    @NotBlank(message = "Name is required")
    private String name;

    private String slug;

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90", message = "Latitude is out of range")
    @DecimalMax(value = "90", message = "Latitude is out of range")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180", message = "Longitude is out of range")
    @DecimalMax(value = "180", message = "Longitude is out of range")
    private Double longitude;

    private String reference;
    private String address;

    @Builder.Default
    private Boolean isAccessible = true;
}
