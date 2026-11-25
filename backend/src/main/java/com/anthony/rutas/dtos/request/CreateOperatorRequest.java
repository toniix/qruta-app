package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateOperatorRequest {

    @NotBlank(message = "Transport line ID is required")
    private String transportLineId;

    @NotBlank(message = "RUC is required")
    @Pattern(regexp = "\\d{11}", message = "RUC must be 11 digits")
    private String ruc;

    private String contactName;
    @Email(message = "Contact email must be a valid email address")
    private String contactEmail;
    private String contactPhone;

    @NotBlank(message = "City ID is required")
    private String cityId;

    @Pattern(regexp = "BASIC|PRO|ENTERPRISE", message = "Plan must be BASIC, PRO or ENTERPRISE")
    private String plan;
}
