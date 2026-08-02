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

    @NotBlank(message = "Name is required")
    private String name;

    private String code;
    private String color;
    private String company;
    private String contact;
    private String description;
    private String status;
}
