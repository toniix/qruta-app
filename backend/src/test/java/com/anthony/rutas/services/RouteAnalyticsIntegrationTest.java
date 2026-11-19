package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.AnalyticsEventBatchRequest;
import com.anthony.rutas.entities.RouteDailyStat;
import com.anthony.rutas.repositories.RouteDailyStatRepository;
import com.anthony.rutas.support.RequiresTestDatabase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Database-backed verification of the analytics pipeline. Skipped when {@code rutas_test}
 * is unreachable so local runs without PostgreSQL still pass.
 */
@SpringBootTest
@ActiveProfiles("test")
@RequiresTestDatabase
class RouteAnalyticsIntegrationTest {

    @Autowired
    private RouteAnalyticsService routeAnalyticsService;

    @Autowired
    private RouteDailyStatRepository routeDailyStatRepository;

    @Test
    void ingestThenAggregateTwiceProducesStableTotals() {
        UUID cityId = UUID.randomUUID();
        UUID routeId = UUID.randomUUID();
        LocalDate date = LocalDate.now(ZoneOffset.UTC).minusDays(1);
        Instant recordedAt = date.atStartOfDay(ZoneOffset.UTC).plusSeconds(60).toInstant();

        List<AnalyticsEventBatchRequest.EventItem> items = new ArrayList<>();
        // Three devices view the route, one device scans a QR twice (dedup by device).
        for (String device : List.of("dev-a", "dev-b", "dev-c")) {
            items.add(item(EventCategory.ROUTE_VIEW, device, routeId, cityId, recordedAt));
        }
        items.add(item(EventCategory.QR_SCAN, "dev-a", routeId, cityId, recordedAt));
        items.add(item(EventCategory.QR_SCAN, "dev-a", routeId, cityId, recordedAt));

        AnalyticsEventBatchRequest request = new AnalyticsEventBatchRequest();
        request.setEvents(items);
        routeAnalyticsService.ingest(request);

        routeAnalyticsService.aggregateDay(date, null);
        List<RouteDailyStat> first = routeDailyStatRepository.findAll();

        routeAnalyticsService.aggregateDay(date, null);
        List<RouteDailyStat> second = routeDailyStatRepository.findAll();

        assertThat(second).hasSameSizeAs(first);
        RouteDailyStat stat = second.stream()
                .filter(s -> routeId.equals(s.getRouteId()))
                .findFirst()
                .orElseThrow();
        assertThat(stat.getViews()).isEqualTo(3);
        assertThat(stat.getQrScans()).isEqualTo(2);
        assertThat(stat.getUniqueDevices()).isEqualTo(3);
    }

    private AnalyticsEventBatchRequest.EventItem item(String category, String device, UUID routeId,
                                                      UUID cityId, Instant recordedAt) {
        AnalyticsEventBatchRequest.EventItem item = new AnalyticsEventBatchRequest.EventItem();
        item.setCategory(category);
        item.setDeviceId(device);
        item.setRouteId(routeId.toString());
        item.setCityId(cityId.toString());
        item.setRecordedAt(recordedAt);
        return item;
    }
}
