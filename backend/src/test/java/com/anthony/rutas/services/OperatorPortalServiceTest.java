package com.anthony.rutas.services;

import com.anthony.rutas.billing.BillingService;
import com.anthony.rutas.billing.SubscriptionAccessService;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.dtos.request.UpdateStopRequest;
import com.anthony.rutas.dtos.response.OperatorAnalyticsSummaryResponse;
import com.anthony.rutas.dtos.response.OperatorStopResponse;
import com.anthony.rutas.dtos.response.RouteAnalyticsSeriesResponse;
import com.anthony.rutas.dtos.response.RouteDetailResponse;
import com.anthony.rutas.dtos.response.SubscriptionResponse;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.RouteDailyStat;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.entities.TransportLine;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.DisruptionRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.RouteDailyStatRepository;
import com.anthony.rutas.repositories.RouteEventRepository;
import com.anthony.rutas.repositories.RouteRepository;
import com.anthony.rutas.repositories.StopRepository;
import com.anthony.rutas.repositories.TransportLineRepository;
import com.anthony.rutas.security.OperatorPrincipal;
import com.anthony.rutas.security.OperatorScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OperatorPortalServiceTest {

    private static final UUID OPERATOR_ID = UUID.randomUUID();
    private static final UUID CITY_ID = UUID.randomUUID();
    private static final UUID ROUTE_ID = UUID.randomUUID();
    private static final UUID LINE_ID = UUID.randomUUID();
    private static final UUID STOP_ID = UUID.randomUUID();

    @Mock
    private SubscriptionAccessService subscriptionAccessService;

    @Mock
    private BillingService billingService;

    @Mock
    private ChangeLogService changeLogService;

    @Mock
    private OperatorRepository operatorRepository;

    @Mock
    private TransportLineRepository transportLineRepository;

    @Mock
    private RouteRepository routeRepository;

    @Mock
    private StopRepository stopRepository;

    @Mock
    private DisruptionRepository disruptionRepository;

    @Mock
    private RouteService routeService;

    @Mock
    private RouteDailyStatRepository routeDailyStatRepository;

    @Mock
    private RouteEventRepository routeEventRepository;

    @Mock
    private RouteAnalyticsService routeAnalyticsService;

    private final GeometryFactory geometryFactory = new GeometryFactory();
    private OperatorPortalService service;

    @BeforeEach
    void setUp() {
        OperatorPrincipal principal = mock(OperatorPrincipal.class);
        lenient().when(principal.getOperatorId()).thenReturn(OPERATOR_ID);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_OPERATOR"))));

        service = new OperatorPortalService(
                new OperatorScope(),
                subscriptionAccessService,
                billingService,
                changeLogService,
                operatorRepository,
                transportLineRepository,
                routeRepository,
                stopRepository,
                disruptionRepository,
                routeService,
                routeDailyStatRepository,
                routeEventRepository,
                routeAnalyticsService,
                geometryFactory);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getSubscriptionDelegatesToBillingService() {
        SubscriptionResponse expected = SubscriptionResponse.builder()
                .plan("PRO")
                .status("ACTIVE")
                .build();
        when(billingService.getSubscription()).thenReturn(expected);

        assertSame(expected, service.getSubscription());
    }

    @Test
    void updateRouteDirectionsRejectsBlockedSubscription() {
        doThrow(new AccessDeniedException("blocked")).when(subscriptionAccessService).requireWriteAccess();

        assertThrows(AccessDeniedException.class,
                () -> service.updateRouteDirections(ROUTE_ID, directionsRequest(STOP_ID)));
        verifyNoInteractions(routeRepository, routeService, changeLogService);
    }

    @Test
    void analyticsSummaryRejectsBlockedSubscription() {
        doThrow(new AccessDeniedException("blocked")).when(subscriptionAccessService).requireAnalyticsAccess();

        assertThrows(AccessDeniedException.class, () -> service.getAnalyticsSummary(null, null));
        verifyNoInteractions(transportLineRepository, routeDailyStatRepository, routeEventRepository);
    }

    @Test
    void getRouteByIdReturnsDetailForOwnedRoute() {
        Route route = Route.builder().id(ROUTE_ID).build();
        RouteDetailResponse expected = RouteDetailResponse.builder().id(ROUTE_ID).build();
        when(routeRepository.findByIdAndOperatorId(ROUTE_ID, OPERATOR_ID)).thenReturn(Optional.of(route));
        when(routeService.findById(ROUTE_ID)).thenReturn(expected);

        assertSame(expected, service.getRouteById(ROUTE_ID));
    }

    @Test
    void getRouteByIdRejectsForeignRoute() {
        when(routeRepository.findByIdAndOperatorId(ROUTE_ID, OPERATOR_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getRouteById(ROUTE_ID));
        verifyNoInteractions(routeService);
    }

    @Test
    void updateRouteDirectionsRejectsStopFromAnotherCity() {
        UUID foreignStopId = UUID.randomUUID();
        UpdateRouteDirectionsRequest request = directionsRequest(foreignStopId);
        when(routeRepository.findByIdAndOperatorId(ROUTE_ID, OPERATOR_ID))
                .thenReturn(Optional.of(Route.builder().id(ROUTE_ID).build()));
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(stopRepository.findByIdAndCityId(foreignStopId, CITY_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.updateRouteDirections(ROUTE_ID, request));
        verify(routeService, never()).updateDirections(eq(ROUTE_ID), same(request));
        verify(changeLogService, never()).record(eq("ROUTE"), eq(ROUTE_ID), eq("directions"),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateRouteDirectionsLogsDirectionCount() {
        UpdateRouteDirectionsRequest request = UpdateRouteDirectionsRequest.builder()
                .directions(List.of(
                        UpdateRouteDirectionsRequest.DirectionUpdateRequest.builder().direction("IDA").build(),
                        UpdateRouteDirectionsRequest.DirectionUpdateRequest.builder().direction("REGRESO").build()))
                .build();
        RouteDetailResponse expected = RouteDetailResponse.builder().id(ROUTE_ID).build();
        when(routeRepository.findByIdAndOperatorId(ROUTE_ID, OPERATOR_ID))
                .thenReturn(Optional.of(Route.builder().id(ROUTE_ID).build()));
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(routeService.updateDirections(eq(ROUTE_ID), same(request))).thenReturn(expected);

        assertSame(expected, service.updateRouteDirections(ROUTE_ID, request));
        verify(changeLogService).record("ROUTE", ROUTE_ID, "directions", 0, 2);
    }

    @Test
    void updateStopMapsLatitudeAndLongitudeAndLogsLocationChange() {
        Stop stop = Stop.builder()
                .id(STOP_ID)
                .name("Terminal")
                .location(geometryFactory.createPoint(new Coordinate(-75.0, -14.0)))
                .build();
        UpdateStopRequest request = UpdateStopRequest.builder()
                .latitude(-14.1)
                .longitude(-75.1)
                .build();
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(stopRepository.findByIdAndCityId(STOP_ID, CITY_ID)).thenReturn(Optional.of(stop));
        when(stopRepository.save(stop)).thenReturn(stop);

        OperatorStopResponse response = service.updateStop(STOP_ID, request);

        assertEquals(-14.1, response.getLatitude());
        assertEquals(-75.1, response.getLongitude());
        verify(changeLogService).record("STOP", STOP_ID, "location", "-14.0,-75.0", "-14.1,-75.1");
    }

    @Test
    void analyticsSummaryOnlyIncludesOwnedLinesAndCampaignScans() {
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 7);
        UUID foreignLineId = UUID.randomUUID();
        LocalDate day = LocalDate.of(2026, 11, 3);

        when(transportLineRepository.findByOperatorId(OPERATOR_ID))
                .thenReturn(List.of(TransportLine.builder().id(LINE_ID).name("Línea 1").build()));
        when(routeDailyStatRepository.findByTransportLineIdInAndDateBetweenOrderByDateAsc(
                Set.of(LINE_ID), from, to))
                .thenReturn(List.of(
                        dailyStat(LINE_ID, day, 3, 2, 1),
                        dailyStat(foreignLineId, day, 99, 99, 99)));
        when(routeRepository.findByOperatorId(OPERATOR_ID)).thenReturn(List.of(
                Route.builder().id(ROUTE_ID).name("Ruta 1").code("101").build()));

        RouteEventRepository.QrCampaignRow campaignRow = mock(RouteEventRepository.QrCampaignRow.class);
        when(campaignRow.getCampaign()).thenReturn("centro");
        when(campaignRow.getScans()).thenReturn(4L);
        when(routeEventRepository.countQrScansByCampaign(
                eq("qr_scan"), any(Instant.class), any(Instant.class), eq(Set.of(LINE_ID))))
                .thenReturn(List.of(campaignRow));

        OperatorAnalyticsSummaryResponse response = service.getAnalyticsSummary(from, to);

        assertEquals(1, response.lines().size());
        assertEquals("Línea 1", response.lines().get(0).lineName());
        assertEquals(3, response.lines().get(0).views());
        assertEquals(2, response.lines().get(0).searches());
        assertEquals(1, response.lines().get(0).qrScans());
        assertEquals(1, response.days().size());
        assertEquals(day, response.days().get(0).date());
        assertEquals(5, response.routes().get(0).interactions());
        assertEquals("centro", response.qrCampaigns().get(0).campaign());
        assertEquals(4, response.qrCampaigns().get(0).scans());
    }

    @Test
    void routeAnalyticsReturnsSeriesForOwnedRoute() {
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 7);
        RouteAnalyticsSeriesResponse expected = new RouteAnalyticsSeriesResponse(ROUTE_ID, List.of());

        when(routeRepository.findByIdAndOperatorId(ROUTE_ID, OPERATOR_ID))
                .thenReturn(Optional.of(Route.builder().id(ROUTE_ID).build()));
        when(routeAnalyticsService.routeSeries(ROUTE_ID, from, to)).thenReturn(expected);

        assertSame(expected, service.getRouteAnalytics(ROUTE_ID, from, to));
    }

    @Test
    void routeAnalyticsRejectsForeignRoute() {
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 7);
        when(routeRepository.findByIdAndOperatorId(ROUTE_ID, OPERATOR_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.getRouteAnalytics(ROUTE_ID, from, to));
        verifyNoInteractions(routeAnalyticsService);
    }

    private RouteDailyStat dailyStat(UUID lineId, LocalDate date, int views, int searches, int qrScans) {
        return RouteDailyStat.builder()
                .routeId(ROUTE_ID)
                .transportLineId(lineId)
                .cityId(CITY_ID)
                .date(date)
                .views(views)
                .searches(searches)
                .qrScans(qrScans)
                .updatedAt(date.atStartOfDay())
                .build();
    }

    private UpdateRouteDirectionsRequest directionsRequest(UUID stopId) {
        return UpdateRouteDirectionsRequest.builder()
                .directions(List.of(UpdateRouteDirectionsRequest.DirectionUpdateRequest.builder()
                        .direction("IDA")
                        .stops(List.of(UpdateRouteDirectionsRequest.StopUpdateRequest.builder()
                                .stopId(stopId.toString())
                                .stopOrder(1)
                                .build()))
                        .build()))
                .build();
    }

    private Operator operator() {
        return Operator.builder()
                .id(OPERATOR_ID)
                .name("Operador Ica")
                .city(City.builder().id(CITY_ID).name("Ica").build())
                .build();
    }
}
