package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRouteRequest {
    private String code;
    private String name;
    private String color;
    private String description;
    private String fare;
    private String schedule;
    private String frequency;
    private String status;

    @Min(value = 0, message = "Popularity score cannot be negative")
    private Integer popularityScore;
}