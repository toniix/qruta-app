package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.AnalyticsEventBatchRequest;
import com.anthony.rutas.dtos.response.AnalyticsOverviewResponse;
import com.anthony.rutas.dtos.response.AnalyticsOverviewResponse.CityUsage;
import com.anthony.rutas.dtos.response.AnalyticsOverviewResponse.DailyUsage;
import com.anthony.rutas.dtos.response.RouteAnalyticsSeriesResponse;
import com.anthony.rutas.entities.RouteDailyStat;
import com.anthony.rutas.entities.RouteEvent;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.repositories.RouteDailyStatRepository;
import com.anthony.rutas.repositories.RouteDailyStatRepository.DailyStatRow;
import com.anthony.rutas.repositories.RouteEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Ingestion and daily aggregation of route usage events.
 *
 * <p>Aggregation is a DELETE + INSERT scoped to (city, date), which makes it idempotent:
 * running it twice for the same day leaves exactly the same rows as running it once.
 */
@Service
@RequiredArgsConstructor
public class RouteAnalyticsService {

    private final RouteEventRepository routeEventRepository;
    private final RouteDailyStatRepository routeDailyStatRepository;
    private final DeviceHasher deviceHasher;

    /** Persists a validated batch; returns how many events were stored. */
    @Transactional
    public int ingest(AnalyticsEventBatchRequest request) {
        Instant receivedAt = Instant.now();
        List<RouteEvent> events = new ArrayList<>(request.getEvents().size());

        for (AnalyticsEventBatchRequest.EventItem item : request.getEvents()) {
            if (!EventCategory.isValid(item.getCategory())) {
                throw new BadRequestException("Invalid event category: " + item.getCategory());
            }
            Instant recordedAt = item.getRecordedAt() != null ? item.getRecordedAt() : receivedAt;
            events.add(RouteEvent.builder()
                    .recordedAt(recordedAt)
                    .receivedAt(receivedAt)
                    .routeId(parseUuid(item.getRouteId(), "routeId"))
                    .stopId(parseUuid(item.getStopId(), "stopId"))
                    .transportLineId(parseUuid(item.getTransportLineId(), "transportLineId"))
                    .cityId(parseUuid(item.getCityId(), "cityId"))
                    .category(item.getCategory())
                    .deviceHash(deviceHasher.hash(item.getDeviceId(), recordedAt))
                    .campaign(trimToNull(item.getCampaign()))
                    .build());
        }

        routeEventRepository.saveAll(events);
        return events.size();
    }

    /**
     * Rebuilds the daily aggregates of one UTC day. When {@code cityId} is null every city
     * present in the raw events is rebuilt; otherwise only that city is.
     */
    @Transactional
    public void aggregateDay(LocalDate date, UUID cityId) {
        Instant start = date.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        List<DailyStatRow> rows = routeDailyStatRepository.aggregateDay(start, end);

        Map<UUID, List<DailyStatRow>> rowsByCity = new LinkedHashMap<>();
        for (DailyStatRow row : rows) {
            if (cityId == null || cityId.equals(row.getCityId())) {
                rowsByCity.computeIfAbsent(row.getCityId(), key -> new ArrayList<>()).add(row);
            }
        }

        for (Map.Entry<UUID, List<DailyStatRow>> entry : rowsByCity.entrySet()) {
            // Delete first: this is what makes re-running the job safe.
            routeDailyStatRepository.deleteByCityIdAndDate(entry.getKey(), date);
            LocalDateTime now = LocalDateTime.now();
            List<RouteDailyStat> stats = entry.getValue().stream()
                    .map(row -> toStat(row, now))
                    .toList();
            routeDailyStatRepository.saveAll(stats);
        }
    }

    /** Aggregates yesterday (UTC) across all cities; invoked by the scheduled job. */
    @Transactional
    public void aggregatePreviousDay() {
        aggregateDay(LocalDate.now(ZoneOffset.UTC).minusDays(1), null);
    }

    @Transactional(readOnly = true)
    public AnalyticsOverviewResponse overview(LocalDate from, LocalDate to) {
        List<RouteDailyStat> stats = routeDailyStatRepository.findByDateBetweenOrderByDateAsc(from, to);

        Map<UUID, UsageTotals> byCity = new LinkedHashMap<>();
        Map<LocalDate, UsageTotals> byDay = new LinkedHashMap<>();
        for (RouteDailyStat stat : stats) {
            byCity.computeIfAbsent(stat.getCityId(), key -> new UsageTotals()).add(stat);
            byDay.computeIfAbsent(stat.getDate(), key -> new UsageTotals()).add(stat);
        }

        List<CityUsage> cities = byCity.entrySet().stream()
                .map(e -> e.getValue().toCityUsage(e.getKey()))
                .sorted(Comparator.comparing(CityUsage::cityId))
                .toList();

        List<DailyUsage> days = byDay.entrySet().stream()
                .map(e -> e.getValue().toDailyUsage(e.getKey()))
                .sorted(Comparator.comparing(DailyUsage::date))
                .toList();

        return new AnalyticsOverviewResponse(cities, days);
    }

    @Transactional(readOnly = true)
    public RouteAnalyticsSeriesResponse routeSeries(UUID routeId, LocalDate from, LocalDate to) {
        List<RouteAnalyticsSeriesResponse.DailyUsage> series =
                routeDailyStatRepository.findByRouteIdAndDateBetweenOrderByDateAsc(routeId, from, to).stream()
                        .map(stat -> new RouteAnalyticsSeriesResponse.DailyUsage(
                                stat.getDate(),
                                stat.getViews(),
                                stat.getSearches(),
                                stat.getQrScans(),
                                stat.getStopViews(),
                                stat.getNearbyQueries(),
                                stat.getCommunityPosts(),
                                stat.getUniqueDevices()))
                        .toList();
        return new RouteAnalyticsSeriesResponse(routeId, series);
    }

    private RouteDailyStat toStat(DailyStatRow row, LocalDateTime now) {
        return RouteDailyStat.builder()
                .routeId(row.getRouteId())
                .transportLineId(row.getTransportLineId())
                .cityId(row.getCityId())
                .date(row.getStatDate())
                .views(intValue(row.getViews()))
                .searches(intValue(row.getSearches()))
                .qrScans(intValue(row.getQrScans()))
                .stopViews(intValue(row.getStopViews()))
                .nearbyQueries(intValue(row.getNearbyQueries()))
                .communityPosts(intValue(row.getCommunityPosts()))
                .uniqueDevices(intValue(row.getUniqueDevices()))
                .updatedAt(now)
                .build();
    }

    private static int intValue(Long value) {
        return value == null ? 0 : value.intValue();
    }

    /** Mutable sum of the seven usage counters, shared by both overview groupings. */
    private static final class UsageTotals {
        private long views;
        private long searches;
        private long qrScans;
        private long stopViews;
        private long nearbyQueries;
        private long communityPosts;
        private long uniqueDevices;

        private void add(RouteDailyStat stat) {
            views += stat.getViews();
            searches += stat.getSearches();
            qrScans += stat.getQrScans();
            stopViews += stat.getStopViews();
            nearbyQueries += stat.getNearbyQueries();
            communityPosts += stat.getCommunityPosts();
            uniqueDevices += stat.getUniqueDevices();
        }

        private CityUsage toCityUsage(UUID cityId) {
            return new CityUsage(cityId, views, searches, qrScans, stopViews, nearbyQueries,
                    communityPosts, uniqueDevices);
        }

        private DailyUsage toDailyUsage(LocalDate date) {
            return new DailyUsage(date, views, searches, qrScans, stopViews, nearbyQueries,
                    communityPosts, uniqueDevices);
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static UUID parseUuid(String value, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid " + field + ": " + value);
        }
    }
}
