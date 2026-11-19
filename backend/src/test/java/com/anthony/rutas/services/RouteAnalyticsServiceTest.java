package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.AnalyticsEventBatchRequest;
import com.anthony.rutas.entities.RouteDailyStat;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.repositories.RouteDailyStatRepository;
import com.anthony.rutas.repositories.RouteDailyStatRepository.DailyStatRow;
import com.anthony.rutas.repositories.RouteEventRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RouteAnalyticsServiceTest {

    private static final UUID CITY = UUID.fromString("00000000-0000-0000-0000-0000000000aa");
    private static final UUID ROUTE = UUID.fromString("00000000-0000-0000-0000-0000000000bb");
    private static final LocalDate DATE = LocalDate.of(2026, 11, 14);

    private final RouteEventRepository routeEventRepository = mock(RouteEventRepository.class);
    private final RouteDailyStatRepository routeDailyStatRepository = mock(RouteDailyStatRepository.class);
    private final DeviceHasher deviceHasher = new DeviceHasher("salt", "jwt");

    private final RouteAnalyticsService service =
            new RouteAnalyticsService(routeEventRepository, routeDailyStatRepository, deviceHasher);

    @Test
    void ingestRejectsAnUnknownCategoryWithoutPersisting() {
        AnalyticsEventBatchRequest request = new AnalyticsEventBatchRequest();
        AnalyticsEventBatchRequest.EventItem item = new AnalyticsEventBatchRequest.EventItem();
        item.setCategory("unknown");
        item.setDeviceId("dev-1");
        request.setEvents(List.of(item));

        assertThatThrownBy(() -> service.ingest(request))
                .isInstanceOf(BadRequestException.class);

        verify(routeEventRepository, times(0)).saveAll(any());
    }

    @Test
    void ingestHashesTheDeviceIdBeforePersisting() {
        AnalyticsEventBatchRequest request = new AnalyticsEventBatchRequest();
        AnalyticsEventBatchRequest.EventItem item = new AnalyticsEventBatchRequest.EventItem();
        item.setCategory(EventCategory.QR_SCAN);
        item.setDeviceId("dev-1");
        item.setRouteId(ROUTE.toString());
        item.setCampaign("paradero-centro");
        request.setEvents(List.of(item));

        service.ingest(request);

        ArgumentCaptor<List<com.anthony.rutas.entities.RouteEvent>> captor = ArgumentCaptor.forClass(List.class);
        verify(routeEventRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).singleElement()
                .satisfies(event -> {
                    assertThat(event.getDeviceHash())
                            .isEqualTo(deviceHasher.hash("dev-1", event.getRecordedAt()))
                            .hasSize(64);
                    assertThat(event.getCategory()).isEqualTo("qr_scan");
                    assertThat(event.getCampaign()).isEqualTo("paradero-centro");
                    assertThat(event.getRouteId()).isEqualTo(ROUTE);
                });
    }

    @Test
    void aggregationIsIdempotentBecauseItDeletesBeforeInserting() {
        DailyStatRow aggregatedRow = row(ROUTE, 5, 2);
        when(routeDailyStatRepository.aggregateDay(any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(aggregatedRow));

        service.aggregateDay(DATE, CITY);
        service.aggregateDay(DATE, CITY);

        verify(routeDailyStatRepository, times(2)).deleteByCityIdAndDate(CITY, DATE);

        ArgumentCaptor<List<RouteDailyStat>> captor = ArgumentCaptor.forClass(List.class);
        verify(routeDailyStatRepository, times(2)).saveAll(captor.capture());

        List<RouteDailyStat> first = captor.getAllValues().get(0);
        List<RouteDailyStat> second = captor.getAllValues().get(1);

        assertThat(first).hasSize(1);
        assertThat(second).hasSize(1);
        assertThat(second.get(0).getViews()).isEqualTo(first.get(0).getViews()).isEqualTo(5);
        assertThat(second.get(0).getSearches()).isEqualTo(first.get(0).getSearches()).isEqualTo(2);
        assertThat(second.get(0).getRouteId()).isEqualTo(ROUTE);
    }

    private DailyStatRow row(UUID routeId, long views, long searches) {
        DailyStatRow row = mock(DailyStatRow.class);
        when(row.getRouteId()).thenReturn(routeId);
        when(row.getTransportLineId()).thenReturn(null);
        when(row.getCityId()).thenReturn(CITY);
        when(row.getStatDate()).thenReturn(DATE);
        when(row.getViews()).thenReturn(views);
        when(row.getSearches()).thenReturn(searches);
        when(row.getQrScans()).thenReturn(0L);
        when(row.getStopViews()).thenReturn(0L);
        when(row.getNearbyQueries()).thenReturn(0L);
        when(row.getCommunityPosts()).thenReturn(0L);
        when(row.getUniqueDevices()).thenReturn(1L);
        return row;
    }
}
