package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateRouteRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.dtos.request.UpdateRouteRequest;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RouteServiceTest {

    @Mock
    private RouteRepository routeRepository;
    @Mock
    private RouteDirectionRepository routeDirectionRepository;
    @Mock
    private RouteStopRepository routeStopRepository;
    @Mock
    private RoutePointRepository routePointRepository;
    @Mock
    private TransportLineRepository transportLineRepository;
    @Mock
    private StopRepository stopRepository;

    @InjectMocks
    private RouteService routeService;

    private UUID routeId;
    private UUID cityId;
    private UUID transportLineId;
    private UUID stopId;
    private City city;
    private TransportLine transportLine;
    private Route route;
    private Stop stop;

    @BeforeEach
    void setUp() {
        routeId = UUID.randomUUID();
        cityId = UUID.randomUUID();
        transportLineId = UUID.randomUUID();
        stopId = UUID.randomUUID();

        city = City.builder()
                .id(cityId)
                .name("La Plata")
                .department("Buenos Aires")
                .country("Argentina")
                .build();

        transportLine = TransportLine.builder()
                .id(transportLineId)
                .city(city)
                .name("Linea 1")
                .code("L1")
                .build();

        route = Route.builder()
                .id(routeId)
                .transportLine(transportLine)
                .code("R1")
                .name("Ruta 1")
                .color("#FF0000")
                .status("ACTIVE")
                .popularityScore(10)
                .build();

        stop = Stop.builder()
                .id(stopId)
                .city(city)
                .name("Parada Central")
                .keyStop(true)
                .build();
    }

    // ==================== HELPER METHODS ====================

    private RouteDirection createRouteDirection(UUID id, Route route) {
        return RouteDirection.builder()
                .id(id)
                .route(route)
                .direction("OUTBOUND")
                .originName("Origen")
                .destinationName("Destino")
                .totalDistanceKm(5.0)
                .estimatedMinutes(30)
                .build();
    }

    private RouteStop createRouteStop(UUID id, RouteDirection direction, Stop stop) {
        return RouteStop.builder()
                .id(id)
                .direction(direction)
                .stop(stop)
                .stopOrder(1)
                .distanceFromStart(0.0)
                .build();
    }

    private CreateRouteRequest createRouteRequest() {
        CreateRouteRequest.RouteStopItemRequest stopItem = CreateRouteRequest.RouteStopItemRequest.builder()
                .stopId(stopId.toString())
                .stopOrder(1)
                .distanceFromStart(0.0)
                .build();

        CreateRouteRequest.RoutePointItemRequest pointItem = CreateRouteRequest.RoutePointItemRequest.builder()
                .pointOrder(1)
                .latitude(-34.9215)
                .longitude(-57.9545)
                .build();

        CreateRouteRequest.RouteDirectionRequest direction = CreateRouteRequest.RouteDirectionRequest.builder()
                .direction("OUTBOUND")
                .originName("Origen")
                .destinationName("Destino")
                .totalDistanceKm(5.0)
                .estimatedMinutes(30)
                .stops(List.of(stopItem))
                .routePoints(List.of(pointItem))
                .build();

        return CreateRouteRequest.builder()
                .transportLineId(transportLineId.toString())
                .code("R1")
                .name("Ruta 1")
                .color("#FF0000")
                .directions(List.of(direction))
                .build();
    }

    // ==================== FIND ALL CARDS ====================

    @Nested
    @DisplayName("findAllCards")
    class FindAllCards {

        @Test
        @DisplayName("Should return routes with key stops")
        void shouldReturnRoutesWithKeyStops() {
            when(routeRepository.findAllWithTransportLine()).thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.findAllCards();

            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("R1", result.get(0).getCode());
        }

        @Test
        @DisplayName("Should filter by city")
        void shouldFilterByCity() {
            when(routeRepository.findAllByCityIdWithTransportLine(cityId)).thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.findAllCards(cityId);

            assertNotNull(result);
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should return empty list when no routes")
        void shouldReturnEmptyList() {
            when(routeRepository.findAllWithTransportLine()).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.findAllCards();

            assertNotNull(result);
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should include frequency in route cards")
        void shouldIncludeFrequencyInCards() {
            route.setFrequency("Cada 8 min");
            when(routeRepository.findAllWithTransportLine()).thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.findAllCards();

            assertEquals(1, result.size());
            assertEquals("Cada 8 min", result.get(0).getFrequency());
        }
    }

    // ==================== FIND POPULAR ROUTES ====================

    @Nested
    @DisplayName("findPopularRoutes")
    class FindPopularRoutes {

        @Test
        @DisplayName("Should return popular routes ordered by score")
        void shouldReturnPopularRoutes() {
            when(routeRepository.findPopular(any(PageRequest.class))).thenReturn(List.of(route));
            when(routeStopRepository.countDistinctStopsByRouteIds(anyList())).thenReturn(List.of());

            List<PopularRouteResponse> result = routeService.findPopularRoutes();

            assertNotNull(result);
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should filter popular routes by city")
        void shouldFilterByCity() {
            when(routeRepository.findPopularByCityId(eq(cityId), any(PageRequest.class))).thenReturn(List.of(route));
            when(routeStopRepository.countDistinctStopsByRouteIds(anyList())).thenReturn(List.of());

            List<PopularRouteResponse> result = routeService.findPopularRoutes(cityId);

            assertNotNull(result);
            assertEquals(1, result.size());
        }
    }

    // ==================== FIND BY ID ====================

    @Nested
    @DisplayName("findById")
    class FindById {

        @Test
        @DisplayName("Should return route detail")
        void shouldReturnRouteDetail() {
            when(routeRepository.findById(routeId)).thenReturn(Optional.of(route));
            when(routeDirectionRepository.findByRouteIdWithStops(routeId)).thenReturn(List.of());

            RouteDetailResponse result = routeService.findById(routeId);

            assertNotNull(result);
            assertEquals("R1", result.getCode());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when route not found")
        void shouldThrowExceptionWhenNotFound() {
            when(routeRepository.findById(routeId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> routeService.findById(routeId));
        }
    }

    // ==================== SEARCH ====================

    @Nested
    @DisplayName("search")
    class Search {

        @Test
        @DisplayName("Should return matching routes")
        void shouldReturnMatchingRoutes() {
            when(routeRepository.searchRankedRouteIds(eq("r1"), any(Pageable.class)))
                    .thenReturn(List.of(routeId));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.search("R1");

            assertNotNull(result);
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should filter search by city")
        void shouldFilterByCity() {
            when(routeRepository.searchRankedRouteIdsByCityId(eq("r1"), eq(cityId), any(Pageable.class)))
                    .thenReturn(List.of(routeId));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.search("R1", cityId);

            assertNotNull(result);
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should normalize accents before querying the repository")
        void shouldNormalizeAccentsBeforeQuerying() {
            when(routeRepository.searchRankedRouteIds(eq("sesion"), any(Pageable.class)))
                    .thenReturn(List.of(routeId));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.search("Sesión");

            assertNotNull(result);
            assertEquals(1, result.size());
            verify(routeRepository).searchRankedRouteIds(eq("sesion"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should not query the repository on blank query")
        void shouldNotQueryOnBlankQuery() {
            List<RouteSummaryResponse> result = routeService.search("   ");

            assertNotNull(result);
            assertTrue(result.isEmpty());
            verifyNoInteractions(routeRepository);
        }

        @Test
        @DisplayName("Should return cross-city results for a global search")
        void shouldReturnCrossCityResults() {
            UUID limaId = UUID.randomUUID();
            City lima = City.builder()
                    .id(limaId)
                    .name("Lima")
                    .department("Lima")
                    .country("Peru")
                    .build();
            TransportLine limaLine = TransportLine.builder()
                    .id(UUID.randomUUID())
                    .city(lima)
                    .name("Linea Lima")
                    .code("LL")
                    .build();
            Route limaRoute = Route.builder()
                    .id(UUID.randomUUID())
                    .transportLine(limaLine)
                    .code("R2")
                    .name("Ruta 2")
                    .status("ACTIVE")
                    .popularityScore(5)
                    .build();
            when(routeRepository.searchRankedRouteIds(eq("ruta"), any(Pageable.class)))
                    .thenReturn(List.of(routeId, limaRoute.getId()));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route, limaRoute));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.search("Ruta");

            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals(
                    Set.of("La Plata", "Lima"),
                    result.stream()
                            .map(RouteSummaryResponse::getCityName)
                            .collect(java.util.stream.Collectors.toSet()));
        }

        @Test
        @DisplayName("Should keep exact-code match ranked above stop-name match")
        void shouldRankExactCodeAboveStopNameMatch() {
            Route stopNameMatch = Route.builder()
                    .id(UUID.randomUUID())
                    .transportLine(transportLine)
                    .code("X9")
                    .name("Otra ruta")
                    .status("ACTIVE")
                    .popularityScore(99)
                    .build();
            when(routeRepository.searchRankedRouteIds(eq("r1"), any(Pageable.class)))
                    .thenReturn(List.of(routeId, stopNameMatch.getId()));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route, stopNameMatch));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.search("R1");

            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals("R1", result.get(0).getCode());
            assertEquals("X9", result.get(1).getCode());
        }

        @Test
        @DisplayName("Should preserve ranked ID order when hydration returns another order")
        void shouldPreserveRankedIdOrder() {
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();
            Route route1 = Route.builder()
                    .id(id1)
                    .transportLine(transportLine)
                    .code("R1")
                    .name("Ruta 1")
                    .status("ACTIVE")
                    .popularityScore(10)
                    .build();
            Route route2 = Route.builder()
                    .id(id2)
                    .transportLine(transportLine)
                    .code("R2")
                    .name("Ruta 2")
                    .status("ACTIVE")
                    .popularityScore(5)
                    .build();
            when(routeRepository.searchRankedRouteIds(eq("r1"), any(Pageable.class)))
                    .thenReturn(List.of(id2, id1));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route1, route2));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.search("R1");

            assertNotNull(result);
            assertEquals(List.of(id2, id1),
                    result.stream().map(RouteSummaryResponse::getId).toList());
        }

        @Test
        @DisplayName("Should never hydrate when ranked IDs are empty")
        void shouldNeverHydrateOnEmptyIds() {
            when(routeRepository.searchRankedRouteIds(eq("ruta"), any(Pageable.class)))
                    .thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.search("Ruta");

            assertNotNull(result);
            assertTrue(result.isEmpty());
            verify(routeRepository, never()).findAllByIdsWithTransportLineAndCity(anyList());
            verifyNoInteractions(routeStopRepository);
        }

        @Test
        @DisplayName("Should preserve ranked ID order for city-scoped search")
        void shouldPreserveRankedIdOrderForCitySearch() {
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();
            Route route1 = Route.builder()
                    .id(id1)
                    .transportLine(transportLine)
                    .code("R1")
                    .name("Ruta 1")
                    .status("ACTIVE")
                    .popularityScore(10)
                    .build();
            Route route2 = Route.builder()
                    .id(id2)
                    .transportLine(transportLine)
                    .code("R2")
                    .name("Ruta 2")
                    .status("ACTIVE")
                    .popularityScore(5)
                    .build();
            when(routeRepository.searchRankedRouteIdsByCityId(eq("r1"), eq(cityId), any(Pageable.class)))
                    .thenReturn(List.of(id2, id1));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route1, route2));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.search("R1", cityId);

            assertNotNull(result);
            assertEquals(List.of(id2, id1),
                    result.stream().map(RouteSummaryResponse::getId).toList());
        }

        @Test
        @DisplayName("Should never hydrate when city-scoped ranked IDs are empty")
        void shouldNeverHydrateOnEmptyCityIds() {
            when(routeRepository.searchRankedRouteIdsByCityId(eq("ruta"), eq(cityId), any(Pageable.class)))
                    .thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.search("Ruta", cityId);

            assertNotNull(result);
            assertTrue(result.isEmpty());
            verify(routeRepository, never()).findAllByIdsWithTransportLineAndCity(anyList());
            verifyNoInteractions(routeStopRepository);
        }
    }

    // ==================== SEARCH SIZE ====================

    @Nested
    @DisplayName("search size")
    class SearchSize {

        @Test
        @DisplayName("Should use the default size when none is given")
        void shouldUseDefaultSize() {
            when(routeRepository.searchRankedRouteIds(eq("r1"), any(Pageable.class)))
                    .thenReturn(List.of(routeId));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            routeService.search("R1");

            var pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
            verify(routeRepository).searchRankedRouteIds(eq("r1"), pageableCaptor.capture());
            assertEquals(50, pageableCaptor.getValue().getPageSize());
        }

        @Test
        @DisplayName("Should clamp an oversized request to the maximum")
        void shouldClampOversizedToMax() {
            when(routeRepository.searchRankedRouteIds(eq("r1"), any(Pageable.class)))
                    .thenReturn(List.of(routeId));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            routeService.search("R1", 500);

            var pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
            verify(routeRepository).searchRankedRouteIds(eq("r1"), pageableCaptor.capture());
            assertEquals(100, pageableCaptor.getValue().getPageSize());
        }

        @Test
        @DisplayName("Should clamp a non-positive request to one")
        void shouldClampNonPositiveToOne() {
            when(routeRepository.searchRankedRouteIds(eq("r1"), any(Pageable.class)))
                    .thenReturn(List.of(routeId));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            routeService.search("R1", 0);

            var pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
            verify(routeRepository).searchRankedRouteIds(eq("r1"), pageableCaptor.capture());
            assertEquals(1, pageableCaptor.getValue().getPageSize());
        }

        @Test
        @DisplayName("Should pass size through to the city-scoped search")
        void shouldPassSizeToCityScopedSearch() {
            when(routeRepository.searchRankedRouteIdsByCityId(eq("r1"), eq(cityId), any(Pageable.class)))
                    .thenReturn(List.of(routeId));
            when(routeRepository.findAllByIdsWithTransportLineAndCity(anyList()))
                    .thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            routeService.search("R1", cityId, 10);

            var pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
            verify(routeRepository)
                    .searchRankedRouteIdsByCityId(eq("r1"), eq(cityId), pageableCaptor.capture());
            assertEquals(10, pageableCaptor.getValue().getPageSize());
        }
    }

    // ==================== NORMALIZE QUERY ====================

    @Nested
    @DisplayName("normalizeQuery")
    class NormalizeQuery {

        @Test
        @DisplayName("Should strip accents and lowercase")
        void shouldStripAccentsAndLowercase() {
            assertEquals("sesion", RouteService.normalizeQuery("Sesión"));
            assertEquals("linea 1", RouteService.normalizeQuery("LÍNEA 1"));
            assertEquals("ica", RouteService.normalizeQuery("Ica"));
        }

        @Test
        @DisplayName("Should return empty string for null or blank input")
        void shouldReturnEmptyForNullOrBlank() {
            assertEquals("", RouteService.normalizeQuery(null));
            assertEquals("", RouteService.normalizeQuery("   "));
        }
    }

    // ==================== FIND BY TRANSPORT LINE ====================

    @Nested
    @DisplayName("findByTransportLine")
    class FindByTransportLine {

        @Test
        @DisplayName("Should return routes by transport line")
        void shouldReturnRoutesByLine() {
            when(routeRepository.findByTransportLineIdWithLine(transportLineId)).thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.findByTransportLine(transportLineId);

            assertNotNull(result);
            assertEquals(1, result.size());
        }
    }

    // ==================== FIND NEARBY ROUTES ====================

    @Nested
    @DisplayName("findNearbyRoutes")
    class FindNearbyRoutes {

        @Test
        @DisplayName("Should return nearby routes")
        void shouldReturnNearbyRoutes() {
            when(stopRepository.findNearby(-34.9215, -57.9545, 1500)).thenReturn(List.of(stop));
            when(routeStopRepository.findRouteIdsByStopIds(anyList())).thenReturn(List.of(routeId));
            when(routeRepository.findAllByIdWithTransportLine(anyList())).thenReturn(List.of(route));
            when(routeStopRepository.findKeyStopsByRouteIds(anyList())).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.findNearbyRoutes(-34.9215, -57.9545, 1500);

            assertNotNull(result);
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should return empty list when no nearby stops")
        void shouldReturnEmptyList() {
            when(stopRepository.findNearby(-34.9215, -57.9545, 1500)).thenReturn(List.of());

            List<RouteSummaryResponse> result = routeService.findNearbyRoutes(-34.9215, -57.9545, 1500);

            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }

    // ==================== CREATE ====================

    @Nested
    @DisplayName("create")
    class Create {

        @Test
        @DisplayName("Should create route with directions")
        void shouldCreateRouteWithDirections() {
            CreateRouteRequest request = createRouteRequest();
            when(transportLineRepository.findById(transportLineId)).thenReturn(Optional.of(transportLine));
            when(routeRepository.save(any(Route.class))).thenReturn(route);
            when(stopRepository.findById(stopId)).thenReturn(Optional.of(stop));
            when(routeRepository.findById(routeId)).thenReturn(Optional.of(route));
            when(routeDirectionRepository.findByRouteIdWithStops(routeId)).thenReturn(List.of());

            RouteDetailResponse result = routeService.create(request);

            assertNotNull(result);
            verify(routeRepository).save(any(Route.class));
            verify(routeDirectionRepository).save(any(RouteDirection.class));
            verify(routeStopRepository).save(any(RouteStop.class));
            verify(routePointRepository).save(any(RoutePoint.class));
        }

        @Test
        @DisplayName("Should create route without directions")
        void shouldCreateRouteWithoutDirections() {
            CreateRouteRequest request = CreateRouteRequest.builder()
                    .transportLineId(transportLineId.toString())
                    .code("R1")
                    .name("Ruta 1")
                    .build();

            when(transportLineRepository.findById(transportLineId)).thenReturn(Optional.of(transportLine));
            when(routeRepository.save(any(Route.class))).thenReturn(route);
            when(routeRepository.findById(routeId)).thenReturn(Optional.of(route));
            when(routeDirectionRepository.findByRouteIdWithStops(routeId)).thenReturn(List.of());

            RouteDetailResponse result = routeService.create(request);

            assertNotNull(result);
            verify(routeRepository).save(any(Route.class));
            verify(routeDirectionRepository).findByRouteIdWithStops(routeId);
        }
    }

    // ==================== UPDATE ====================

    @Nested
    @DisplayName("update")
    class Update {

        @Test
        @DisplayName("Should partially update route fields")
        void shouldPartiallyUpdateRoute() {
            UpdateRouteRequest request = UpdateRouteRequest.builder()
                    .name("Ruta Actualizada")
                    .color("#00FF00")
                    .build();

            when(routeRepository.findById(routeId)).thenReturn(Optional.of(route));
            when(routeRepository.save(any(Route.class))).thenReturn(route);

            AdminRouteSummaryResponse result = routeService.update(routeId, request);

            assertNotNull(result);
            verify(routeRepository).save(any(Route.class));
        }
    }

    // ==================== UPDATE DIRECTIONS ====================

    @Nested
    @DisplayName("updateDirections")
    class UpdateDirections {

        @Test
        @DisplayName("Should replace existing directions")
        void shouldReplaceDirections() {
            UpdateRouteDirectionsRequest request = UpdateRouteDirectionsRequest.builder()
                    .directions(List.of())
                    .build();

            when(routeRepository.findById(routeId)).thenReturn(Optional.of(route));
            when(routeDirectionRepository.findByRouteId(routeId)).thenReturn(List.of());
            when(routeRepository.findById(routeId)).thenReturn(Optional.of(route));
            when(routeDirectionRepository.findByRouteIdWithStops(routeId)).thenReturn(List.of());

            RouteDetailResponse result = routeService.updateDirections(routeId, request);

            assertNotNull(result);
            verify(routeDirectionRepository).deleteAll(anyList());
        }
    }

    // ==================== DELETE ====================

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("Should delete existing route")
        void shouldDeleteRoute() {
            when(routeRepository.existsById(routeId)).thenReturn(true);
            doNothing().when(routeRepository).deleteById(routeId);

            routeService.delete(routeId);

            verify(routeRepository).deleteById(routeId);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when deleting non-existent route")
        void shouldThrowExceptionWhenDeletingNonExistent() {
            when(routeRepository.existsById(routeId)).thenReturn(false);

            assertThrows(ResourceNotFoundException.class, () -> routeService.delete(routeId));
        }
    }
}
