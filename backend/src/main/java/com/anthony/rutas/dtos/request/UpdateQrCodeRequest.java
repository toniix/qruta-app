package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateQrCodeRequest {

    @Size(max = 120, message = "label must not exceed 120 characters")
    private String label;

    @Pattern(regexp = "HOME|ROUTE|STOP|CAMPAIGN", message = "targetType must be HOME, ROUTE, STOP, or CAMPAIGN")
    private String targetType;

    private UUID targetId;

    @Pattern(regexp = "ACTIVE|PAUSED", message = "status must be ACTIVE or PAUSED")
    private String status;

    @Size(max = 60, message = "campaignSource must not exceed 60 characters")
    private String campaignSource;

    @Size(max = 60, message = "campaignMedium must not exceed 60 characters")
    private String campaignMedium;

    @Size(max = 100, message = "campaignName must not exceed 100 characters")
    private String campaignName;
}
