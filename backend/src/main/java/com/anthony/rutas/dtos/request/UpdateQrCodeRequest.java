package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateQrCodeRequest {

    @Size(max = 120, message = "label must not exceed 120 characters")
    private String label;

    @Pattern(regexp = "ACTIVE|PAUSED|REVOKED", message = "status must be ACTIVE, PAUSED, or REVOKED")
    private String status;

    @Size(max = 60, message = "campaignSource must not exceed 60 characters")
    private String campaignSource;

    @Size(max = 60, message = "campaignMedium must not exceed 60 characters")
    private String campaignMedium;

    @Size(max = 100, message = "campaignName must not exceed 100 characters")
    private String campaignName;
}
