package com.anthony.rutas.dtos.response;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Usage totals visible to one operator, limited to its own lines and routes. */
public record OperatorAnalyticsSummaryResponse(
        List<LineUsage> lines,
        List<DailyUsage> days,
        List<RouteRanking> routes,
        List<QrCampaignUsage> qrCampaigns) {

    public record LineUsage(
            UUID lineId,
            String lineName,
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

    public record RouteRanking(
            UUID routeId,
            String routeName,
            String routeCode,
            long views,
            long searches,
            long qrScans,
            long interactions) {
    }

    public record QrCampaignUsage(
            String campaign,
            long scans) {
    }
}
