package com.anthony.rutas.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QrCodeResponse {
    private UUID id;
    private String code;
    private String label;
    private String targetType;
    private UUID targetId;
    private String targetTitle;
    private String campaignSource;
    private String campaignMedium;
    private String campaignName;
    private String status;
    private UUID operatorId;
    private String operatorName;
    private String canonicalUrl;
    private String targetUrl;
    private long totalScans;
    private Instant createdAt;
    private Instant updatedAt;
}
