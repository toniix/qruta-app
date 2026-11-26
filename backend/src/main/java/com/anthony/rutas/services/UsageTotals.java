package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.AnalyticsOverviewResponse;
import com.anthony.rutas.dtos.response.OperatorAnalyticsSummaryResponse;
import com.anthony.rutas.entities.RouteDailyStat;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Shared mutable accumulator for the seven daily usage counters, reused by
 * both platform overview ({@link RouteAnalyticsService}) and operator portal
 * summaries ({@link OperatorPortalService}).
 */
final class UsageTotals {

    private long views;
    private long searches;
    private long qrScans;
    private long stopViews;
    private long nearbyQueries;
    private long communityPosts;
    private long uniqueDevices;

    void add(RouteDailyStat stat) {
        views += stat.getViews();
        searches += stat.getSearches();
        qrScans += stat.getQrScans();
        stopViews += stat.getStopViews();
        nearbyQueries += stat.getNearbyQueries();
        communityPosts += stat.getCommunityPosts();
        uniqueDevices += stat.getUniqueDevices();
    }

    long views() {
        return views;
    }

    long searches() {
        return searches;
    }

    long qrScans() {
        return qrScans;
    }

    AnalyticsOverviewResponse.CityUsage toCityUsage(UUID cityId) {
        return new AnalyticsOverviewResponse.CityUsage(
                cityId, views, searches, qrScans, stopViews, nearbyQueries, communityPosts, uniqueDevices);
    }

    AnalyticsOverviewResponse.DailyUsage toOverviewDailyUsage(LocalDate date) {
        return new AnalyticsOverviewResponse.DailyUsage(
                date, views, searches, qrScans, stopViews, nearbyQueries, communityPosts, uniqueDevices);
    }

    OperatorAnalyticsSummaryResponse.LineUsage toLineUsage(UUID lineId, String lineName) {
        return new OperatorAnalyticsSummaryResponse.LineUsage(
                lineId, lineName, views, searches, qrScans, stopViews, nearbyQueries, communityPosts, uniqueDevices);
    }

    OperatorAnalyticsSummaryResponse.DailyUsage toOperatorDailyUsage(LocalDate date) {
        return new OperatorAnalyticsSummaryResponse.DailyUsage(
                date, views, searches, qrScans, stopViews, nearbyQueries, communityPosts, uniqueDevices);
    }
}
