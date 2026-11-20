package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTransportLineRequest {
    @NotBlank(message = "City ID is required")
    private String cityId;

    @NotBlank(message = "Company is required")
    private String company;

    private String color;
    private String contact;
    private String description;
    private String status;

    /** Optional operator that owns the line. Null leaves it unassigned (platform-owned). */
    private String operatorId;
}
