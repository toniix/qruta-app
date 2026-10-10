package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateRouteRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.dtos.request.UpdateRouteRequest;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.*;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RouteService {

    private static final int MAX_POPULAR_ROUTES = 10;

    private final RouteRepository routeRepository;
    private final RouteDirectionRepository routeDirectionRepository;
    private final RouteStopRepository routeStopRepository;
    private final RoutePointRepository routePointRepository;
    private final TransportLineRepository transportLineRepository;
    private final StopRepository stopRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory();

    public List<RouteSummaryResponse> findAll() {
        return DtoMapper.toRouteSummaryList(routeRepository.findAll());
    }

    /**
     * Returns a lightweight summary list for the public route cards endpoint.
     * Fetches routes and their key stops in exactly 2 optimized SQL queries, eliminating N+1 queries.
     */
    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> findAllCards() {
        List<Route> routes = routeRepository.findAllWithTransportLine();
        return toOptimizedRouteSummaryList(routes);
    }

    /**
     * Helper to batch-load key stops for a list of routes in a single query.
     */
    private List<RouteSummaryResponse> toOptimizedRouteSummaryList(List<Route> routes) {
        if (routes.isEmpty()) {
            return List.of();
        }

        List<UUID> routeIds = routes.stream().map(Route::getId).toList();
        List<RouteStop> keyRouteStops = routeStopRepository.findKeyStopsByRouteIds(routeIds);

        // Group key stops by Route ID
        java.util.Map<UUID, List<KeyStopResponse>> keyStopsByRouteId = keyRouteStops.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        rs -> rs.getDirection().getRoute().getId(),
                        java.util.stream.Collectors.mapping(
                                rs -> DtoMapper.toKeyStopResponse(rs.getStop()),
                                java.util.stream.Collectors.collectingAndThen(
                                        java.util.stream.Collectors.toList(),
                                        list -> list.stream().filter(java.util.Objects::nonNull).distinct().toList()
                                )
                        )
                ));

        return routes.stream()
                .map(route -> DtoMapper.toRouteSummaryResponse(
                        route,
                        keyStopsByRouteId.getOrDefault(route.getId(), List.of())
                ))
                .toList();
    }

    /**
     * Returns the most popular active routes (top N) for the home screen
     * "Rutas populares" section.
     */
    @Transactional(readOnly = true)
    public List<PopularRouteResponse> findPopularRoutes() {
        return routeRepository.findPopular(PageRequest.of(0, MAX_POPULAR_ROUTES))
                .stream()
                .map(DtoMapper::toPopularRouteResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RouteDetailResponse findById(UUID id) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + id));
        List<RouteDirection> directions = routeDirectionRepository.findByRouteIdWithStops(id);
        return DtoMapper.toRouteDetailResponse(route, directions);
    }

    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> search(String query) {
        List<Route> routes = routeRepository.searchByQuery(query);
        return toOptimizedRouteSummaryList(routes);
    }

    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> findByTransportLine(UUID transportLineId) {
        List<Route> routes = routeRepository.findByTransportLineId(transportLineId);
        return toOptimizedRouteSummaryList(routes);
    }

    /**
     * Finds routes nearby a geographic coordinate within radius meters.
     */
    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> findNearbyRoutes(double latitude, double longitude, double radiusMeters) {
        List<Stop> nearbyStops = stopRepository.findNearby(latitude, longitude, radiusMeters);
        List<Route> routes = nearbyStops.stream()
                .flatMap(stop -> routeStopRepository.findByStopId(stop.getId()).stream())
                .map(routeStop -> routeStop.getDirection().getRoute())
                .distinct()
                .toList();

        return toOptimizedRouteSummaryList(routes);
    }

    @Transactional
    public RouteDetailResponse create(CreateRouteRequest request) {
        TransportLine transportLine = transportLineRepository.findById(UUID.fromString(request.getTransportLineId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Transport line not found with id: " + request.getTransportLineId()));

        Route route = Route.builder()
                .transportLine(transportLine)
                .code(request.getCode())
                .name(request.getName())
                .color(request.getColor())
                .description(request.getDescription())
                .fare(request.getFare())
                .schedule(request.getSchedule())
                .frequency(request.getFrequency())
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .popularityScore(request.getPopularityScore() != null ? request.getPopularityScore() : 0)
                .build();

        route = routeRepository.save(route);

        if (request.getDirections() != null) {
            for (CreateRouteRequest.RouteDirectionRequest dirReq : request.getDirections()) {
                RouteDirection direction = RouteDirection.builder()
                        .route(route)
                        .direction(dirReq.getDirection())
                        .originName(dirReq.getOriginName())
                        .destinationName(dirReq.getDestinationName())
                        .totalDistanceKm(dirReq.getTotalDistanceKm())
                        .estimatedMinutes(dirReq.getEstimatedMinutes())
                        .build();

                direction = routeDirectionRepository.save(direction);

                if (dirReq.getStops() != null) {
                    for (CreateRouteRequest.RouteStopItemRequest stopReq : dirReq.getStops()) {
                        Stop stop = stopRepository.findById(UUID.fromString(stopReq.getStopId()))
                                .orElseThrow(() -> new ResourceNotFoundException(
                                        "Stop not found with id: " + stopReq.getStopId()));
                        RouteStop routeStop = RouteStop.builder()
                                .direction(direction)
                                .stop(stop)
                                .stopOrder(stopReq.getStopOrder())
                                .distanceFromStart(stopReq.getDistanceFromStart())
                                .build();
                        routeStopRepository.save(routeStop);
                    }
                }

                if (dirReq.getRoutePoints() != null) {
                    for (CreateRouteRequest.RoutePointItemRequest pointReq : dirReq.getRoutePoints()) {
                        Point location = geometryFactory
                                .createPoint(new Coordinate(pointReq.getLongitude(), pointReq.getLatitude()));
                        RoutePoint routePoint = RoutePoint.builder()
                                .direction(direction)
                                .pointOrder(pointReq.getPointOrder())
                                .location(location)
                                .build();
                        routePointRepository.save(routePoint);
                    }
                }
            }
        }

        return findById(route.getId());
    }

    @Transactional
    public RouteSummaryResponse update(UUID id, UpdateRouteRequest request) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + id));

        if (request.getCode() != null)
            route.setCode(request.getCode());
        if (request.getName() != null)
            route.setName(request.getName());
        if (request.getColor() != null)
            route.setColor(request.getColor());
        if (request.getDescription() != null)
            route.setDescription(request.getDescription());
        if (request.getFare() != null)
            route.setFare(request.getFare());
        if (request.getSchedule() != null)
            route.setSchedule(request.getSchedule());
        if (request.getFrequency() != null)
            route.setFrequency(request.getFrequency());
        if (request.getStatus() != null)
            route.setStatus(request.getStatus());
        if (request.getPopularityScore() != null)
            route.setPopularityScore(request.getPopularityScore());

        return DtoMapper.toRouteSummaryResponse(routeRepository.save(route));
    }

    @Transactional
    public RouteDetailResponse updateDirections(UUID routeId, UpdateRouteDirectionsRequest request) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + routeId));

        // Delete existing directions and their stops/points
        List<RouteDirection> existingDirections = routeDirectionRepository.findByRouteId(routeId);
        for (RouteDirection dir : existingDirections) {
            routePointRepository.deleteAll(dir.getRoutePoints());
            routeStopRepository.deleteAll(dir.getRouteStops());
        }
        routeDirectionRepository.deleteAll(existingDirections);

        // Create new directions
        for (UpdateRouteDirectionsRequest.DirectionUpdateRequest dirReq : request.getDirections()) {
            RouteDirection direction = RouteDirection.builder()
                    .route(route)
                    .direction(dirReq.getDirection())
                    .originName(dirReq.getOriginName())
                    .destinationName(dirReq.getDestinationName())
                    .totalDistanceKm(dirReq.getTotalDistanceKm())
                    .estimatedMinutes(dirReq.getEstimatedMinutes())
                    .build();

            direction = routeDirectionRepository.save(direction);

            if (dirReq.getStops() != null) {
                for (UpdateRouteDirectionsRequest.StopUpdateRequest stopReq : dirReq.getStops()) {
                    Stop stop = stopRepository.findById(UUID.fromString(stopReq.getStopId()))
                            .orElseThrow(() -> new ResourceNotFoundException(
                                    "Stop not found with id: " + stopReq.getStopId()));
                    RouteStop routeStop = RouteStop.builder()
                            .direction(direction)
                            .stop(stop)
                            .stopOrder(stopReq.getStopOrder())
                            .distanceFromStart(stopReq.getDistanceFromStart())
                            .build();
                    routeStopRepository.save(routeStop);
                }
            }

            if (dirReq.getRoutePoints() != null) {
                for (UpdateRouteDirectionsRequest.PointUpdateRequest pointReq : dirReq.getRoutePoints()) {
                    Point location = geometryFactory
                            .createPoint(new Coordinate(pointReq.getLongitude(), pointReq.getLatitude()));
                    RoutePoint routePoint = RoutePoint.builder()
                            .direction(direction)
                            .pointOrder(pointReq.getPointOrder())
                            .location(location)
                            .build();
                    routePointRepository.save(routePoint);
                }
            }
        }

        return findById(routeId);
    }

    @Transactional
    public void delete(UUID id) {
        if (!routeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Route not found with id: " + id);
        }
        routeRepository.deleteById(id);
    }
}
