package com.anthony.rutas.dtos.response;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Platform-wide usage totals grouped by city and by day. */
public record AnalyticsOverviewResponse(
        List<CityUsage> cities,
        List<DailyUsage> days) {

    public record CityUsage(
            UUID cityId,
            long views,
            long searches,
            long qrScans,
            long stopViews,
            long nearbyQueries,
            long communityPosts,
            long uniqueDevices) {
    }

    public record DailyUsage(
            LocalDate date,
            long views,
            long searches,
            long qrScans,
            long stopViews,
            long nearbyQueries,
            long communityPosts,
            long uniqueDevices) {
    }
}
