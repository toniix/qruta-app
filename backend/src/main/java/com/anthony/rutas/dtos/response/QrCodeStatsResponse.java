package com.anthony.rutas.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QrCodeStatsResponse {
    private UUID id;
    private String code;
    private String label;
    private String status;
    private long totalScans;
    private long effectiveViews;
    private List<DailyScanStat> dailyScans;

    public record DailyScanStat(LocalDate date, long scans) {}
}
