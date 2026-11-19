package com.anthony.rutas.dtos.response;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Daily demand series for a single route. */
public record RouteAnalyticsSeriesResponse(
        UUID routeId,
        List<DailyUsage> series) {

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
