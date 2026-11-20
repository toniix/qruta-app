package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateOperatorRequest {

    private String name;

    @Pattern(regexp = "\\d{11}", message = "RUC must be 11 digits")
    private String ruc;

    private String contactName;
    private String contactEmail;
    private String contactPhone;

    private String cityId;

    @Pattern(regexp = "BASIC|PRO|ENTERPRISE", message = "Plan must be BASIC, PRO or ENTERPRISE")
    private String plan;

    private Boolean active;
}
