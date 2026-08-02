package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStopRequest {
    private String name;
    private Double latitude;
    private Double longitude;
    private String reference;
    private String address;
    private Boolean isAccessible;
}
