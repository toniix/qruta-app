package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateRouteRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.dtos.request.UpdateRouteRequest;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.*;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RouteService {

    private static final int MAX_POPULAR_ROUTES = 10;

    /** Default server-side cap for search results. */
    public static final int DEFAULT_SEARCH_SIZE = 50;

    /** Maximum server-side cap for search results. */
    public static final int MAX_SEARCH_SIZE = 100;

    private final RouteRepository routeRepository;
    private final RouteDirectionRepository routeDirectionRepository;
    private final RouteStopRepository routeStopRepository;
    private final RoutePointRepository routePointRepository;
    private final TransportLineRepository transportLineRepository;
    private final StopRepository stopRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    /**
     * Flat route list for the admin panel. Uses a single {@code JOIN FETCH} query
     * and never touches directions, route stops or key stops, so it stays at 1 SQL
     * statement regardless of how many routes exist.
     */
    @Transactional(readOnly = true)
    public List<AdminRouteSummaryResponse> findAll() {
        return DtoMapper.toAdminRouteSummaryList(routeRepository.findAllWithTransportLine());
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
     * Returns a lightweight summary list filtered by city.
     */
    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> findAllCards(UUID cityId) {
        List<Route> routes = routeRepository.findAllByCityIdWithTransportLine(cityId);
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
        List<Route> popularRoutes = routeRepository.findPopular(PageRequest.of(0, MAX_POPULAR_ROUTES));
        if (popularRoutes.isEmpty()) {
            return List.of();
        }

        List<UUID> routeIds = popularRoutes.stream().map(Route::getId).toList();
        List<Object[]> counts = routeStopRepository.countDistinctStopsByRouteIds(routeIds);
        java.util.Map<UUID, Integer> stopsCountByRouteId = counts.stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).intValue()
                ));

        return popularRoutes.stream()
                .map(r -> DtoMapper.toPopularRouteResponse(r, stopsCountByRouteId.getOrDefault(r.getId(), 0)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PopularRouteResponse> findPopularRoutes(UUID cityId) {
        List<Route> popularRoutes = routeRepository.findPopularByCityId(cityId, PageRequest.of(0, MAX_POPULAR_ROUTES));
        if (popularRoutes.isEmpty()) {
            return List.of();
        }

        List<UUID> routeIds = popularRoutes.stream().map(Route::getId).toList();
        List<Object[]> counts = routeStopRepository.countDistinctStopsByRouteIds(routeIds);
        java.util.Map<UUID, Integer> stopsCountByRouteId = counts.stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).intValue()
                ));

        return popularRoutes.stream()
                .map(r -> DtoMapper.toPopularRouteResponse(r, stopsCountByRouteId.getOrDefault(r.getId(), 0)))
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
    public RouteDetailResponse findByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResourceNotFoundException("Route identifier cannot be blank");
        }
        Route route = null;
        try {
            UUID id = UUID.fromString(identifier.trim());
            route = routeRepository.findById(id).orElse(null);
        } catch (IllegalArgumentException ignored) {
            // Not a valid UUID, look up by code
        }

        if (route == null) {
            route = routeRepository.findByCodeIgnoreCase(identifier.trim())
                    .orElseThrow(() -> new ResourceNotFoundException("Route not found with identifier: " + identifier));
        }

        List<RouteDirection> directions = routeDirectionRepository.findByRouteIdWithStops(route.getId());
        return DtoMapper.toRouteDetailResponse(route, directions);
    }

    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> search(String query) {
        return search(query, DEFAULT_SEARCH_SIZE);
    }

    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> search(String query, int size) {
        String normalized = normalizeQuery(query);
        if (normalized.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = routeRepository.searchRankedRouteIds(
                normalized, PageRequest.of(0, clampSearchSize(size)));
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Route> routes = routeRepository.findAllByIdsWithTransportLineAndCity(ids);
        return toOptimizedRouteSummaryList(reorderByIds(routes, ids));
    }

    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> search(String query, UUID cityId) {
        return search(query, cityId, DEFAULT_SEARCH_SIZE);
    }

    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> search(String query, UUID cityId, int size) {
        String normalized = normalizeQuery(query);
        if (normalized.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = routeRepository.searchRankedRouteIdsByCityId(
                normalized, cityId, PageRequest.of(0, clampSearchSize(size)));
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Route> routes = routeRepository.findAllByIdsWithTransportLineAndCity(ids);
        return toOptimizedRouteSummaryList(reorderByIds(routes, ids));
    }

    /**
     * Restores step-1 ranked ID order after hydration: the {@code IN} query
     * preserves no order, so entities are re-sequenced to the ranked IDs here.
     * Unknown IDs are dropped defensively.
     */
    private List<Route> reorderByIds(List<Route> routes, List<UUID> ids) {
        Map<UUID, Route> byId = routes.stream()
                .collect(Collectors.toMap(Route::getId, Function.identity(), (a, b) -> a));
        return ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * Bounds a requested search size to the 1–100 range.
     */
    static int clampSearchSize(int size) {
        return Math.min(Math.max(size, 1), MAX_SEARCH_SIZE);
    }

    /**
     * Normalizes a search term for accent/case-insensitive matching: strips
     * diacritics, lowercases and trims. The repository query applies Postgres
     * {@code unaccent()} on the column side, so both sides compare normalized.
     */
    static String normalizeQuery(String query) {
        if (query == null) {
            return "";
        }
        String stripped = Normalizer.normalize(query, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return stripped.toLowerCase(Locale.ROOT).trim();
    }

    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> findByTransportLine(UUID transportLineId) {
        List<Route> routes = routeRepository.findByTransportLineIdWithLine(transportLineId);
        return toOptimizedRouteSummaryList(routes);
    }

    /**
     * Finds routes nearby a geographic coordinate within radius meters.
     * Runs in a fixed 4 queries regardless of how many stops fall inside the
     * radius: nearby stops, their route ids in one batch, the routes joined to
     * their transport line, then the key-stop batch.
     */
    @Transactional(readOnly = true)
    public List<RouteSummaryResponse> findNearbyRoutes(double latitude, double longitude, double radiusMeters) {
        List<Stop> nearbyStops = stopRepository.findNearby(latitude, longitude, radiusMeters);
        if (nearbyStops.isEmpty()) {
            return List.of();
        }

        List<UUID> routeIds = routeStopRepository.findRouteIdsByStopIds(
                nearbyStops.stream().map(Stop::getId).toList());
        if (routeIds.isEmpty()) {
            return List.of();
        }

        List<Route> routes = routeRepository.findAllByIdWithTransportLine(routeIds);
        return toOptimizedRouteSummaryList(routes);
    }

    @Transactional
    public RouteDetailResponse create(CreateRouteRequest request) {
        TransportLine transportLine = transportLineRepository
                .findById(parseRequiredUuid(request.getTransportLineId(), "transport line id"))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Transport line not found with id: " + request.getTransportLineId()));

        Route route = Route.builder()
                .transportLine(transportLine)
                .code(request.getCode())
                .name(request.getName())
                .category(request.getCategory() != null && !request.getCategory().isBlank()
                        ? request.getCategory().trim().toUpperCase()
                        : "MICRO")
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

                RouteDirection savedDirection = routeDirectionRepository.save(direction);
                if (savedDirection != null) {
                    direction = savedDirection;
                }
                if (direction.getRouteStops() == null) {
                    direction.setRouteStops(new ArrayList<>());
                }
                if (direction.getRoutePoints() == null) {
                    direction.setRoutePoints(new ArrayList<>());
                }
                if (route.getDirections() != null && Hibernate.isInitialized(route.getDirections())) {
                    route.getDirections().add(direction);
                }

                if (dirReq.getStops() != null) {
                    for (CreateRouteRequest.RouteStopItemRequest stopReq : dirReq.getStops()) {
                        Stop stop = stopRepository.findById(parseStopId(stopReq.getStopId()))
                                .orElseThrow(() -> new ResourceNotFoundException(
                                        "Stop not found with id: " + stopReq.getStopId()));
                        RouteStop routeStop = RouteStop.builder()
                                .direction(direction)
                                .stop(stop)
                                .stopOrder(stopReq.getStopOrder())
                                .distanceFromStart(stopReq.getDistanceFromStart())
                                .build();
                        RouteStop savedStop = routeStopRepository.save(routeStop);
                        direction.getRouteStops().add(savedStop != null ? savedStop : routeStop);
                    }
                    direction.getRouteStops().sort(Comparator.comparing(RouteStop::getStopOrder,
                            Comparator.nullsLast(Integer::compareTo)));
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
                        RoutePoint savedPoint = routePointRepository.save(routePoint);
                        direction.getRoutePoints().add(savedPoint != null ? savedPoint : routePoint);
                    }
                    direction.getRoutePoints().sort(Comparator.comparing(RoutePoint::getPointOrder,
                            Comparator.nullsLast(Integer::compareTo)));
                }
            }
        }

        return findById(route.getId());
    }

    @Transactional
    public AdminRouteSummaryResponse update(UUID id, UpdateRouteRequest request) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + id));

        if (request.getCode() != null)
            route.setCode(request.getCode());
        if (request.getName() != null)
            route.setName(request.getName());
        if (request.getCategory() != null && !request.getCategory().isBlank())
            route.setCategory(request.getCategory().trim().toUpperCase());
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

        return DtoMapper.toAdminRouteSummaryResponse(routeRepository.save(route));
    }

    @Transactional
    public RouteDetailResponse updateDirections(UUID routeId, UpdateRouteDirectionsRequest request) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + routeId));

        // Snapshot geometry before deleting, so a stops-only edit never destroys it.
        List<RouteDirection> existingDirections = routeDirectionRepository.findByRouteId(routeId);
        Map<UUID, List<GeometryPoint>> geometryByDirectionId = new HashMap<>();
        Map<String, List<GeometryPoint>> geometryByDirectionValue = new HashMap<>();
        for (RouteDirection dir : existingDirections) {
            List<GeometryPoint> geometry = dir.getRoutePoints().stream()
                    .sorted(Comparator.comparing(RoutePoint::getPointOrder,
                            Comparator.nullsLast(Integer::compareTo)))
                    .map(point -> new GeometryPoint(point.getPointOrder(), point.getLocation()))
                    .toList();
            if (dir.getId() != null) {
                geometryByDirectionId.put(dir.getId(), geometry);
            }
            if (dir.getDirection() != null) {
                geometryByDirectionValue.put(dir.getDirection(), geometry);
            }
        }

        for (RouteDirection dir : existingDirections) {
            routePointRepository.deleteAll(dir.getRoutePoints());
            routeStopRepository.deleteAll(dir.getRouteStops());
        }
        // Detach deleted directions from Route.directions if already initialized
        // (e.g. OperatorPortalService) so cascade/orphanRemoval does not re-save deleted entities.
        if (route.getDirections() != null && Hibernate.isInitialized(route.getDirections())) {
            route.getDirections().clear();
        }
        routeDirectionRepository.deleteAll(existingDirections);

        // Hibernate executes INSERTs before DELETEs on flush. Without this flush
        // the new direction collides with UNIQUE(route_id, direction) while the
        // old one is still present, producing a 500 on replace.
        routeDirectionRepository.flush();

        for (UpdateRouteDirectionsRequest.DirectionUpdateRequest dirReq : request.getDirections()) {
            RouteDirection direction = RouteDirection.builder()
                    .route(route)
                    .direction(dirReq.getDirection())
                    .originName(dirReq.getOriginName())
                    .destinationName(dirReq.getDestinationName())
                    .totalDistanceKm(dirReq.getTotalDistanceKm())
                    .estimatedMinutes(dirReq.getEstimatedMinutes())
                    .build();

            RouteDirection savedDirection = routeDirectionRepository.save(direction);
            if (savedDirection != null) {
                direction = savedDirection;
            }
            if (direction.getRouteStops() == null) {
                direction.setRouteStops(new ArrayList<>());
            }
            if (direction.getRoutePoints() == null) {
                direction.setRoutePoints(new ArrayList<>());
            }
            if (route.getDirections() != null && Hibernate.isInitialized(route.getDirections())) {
                route.getDirections().add(direction);
            }

            if (dirReq.getStops() != null) {
                for (UpdateRouteDirectionsRequest.StopUpdateRequest stopReq : dirReq.getStops()) {
                    Stop stop = stopRepository.findById(parseStopId(stopReq.getStopId()))
                            .orElseThrow(() -> new ResourceNotFoundException(
                                    "Stop not found with id: " + stopReq.getStopId()));
                    RouteStop routeStop = RouteStop.builder()
                            .direction(direction)
                            .stop(stop)
                            .stopOrder(stopReq.getStopOrder())
                            .distanceFromStart(stopReq.getDistanceFromStart())
                            .build();
                    RouteStop savedStop = routeStopRepository.save(routeStop);
                    direction.getRouteStops().add(savedStop != null ? savedStop : routeStop);
                }
                direction.getRouteStops().sort(Comparator.comparing(RouteStop::getStopOrder,
                        Comparator.nullsLast(Integer::compareTo)));
            }

            List<GeometryPoint> geometry = resolveGeometry(dirReq,
                    geometryByDirectionId, geometryByDirectionValue);
            for (GeometryPoint point : geometry) {
                if (point.location() == null) continue;
                RoutePoint routePoint = RoutePoint.builder()
                        .direction(direction)
                        .pointOrder(point.order())
                        .location(point.location())
                        .build();
                RoutePoint savedPoint = routePointRepository.save(routePoint);
                direction.getRoutePoints().add(savedPoint != null ? savedPoint : routePoint);
            }
            direction.getRoutePoints().sort(Comparator.comparing(RoutePoint::getPointOrder,
                    Comparator.nullsLast(Integer::compareTo)));
        }

        return findById(routeId);
    }

    /**
     * {@code null} routePoints keeps the stored geometry, an empty list clears it,
     * a non-empty list replaces it exactly as submitted.
     */
    private List<GeometryPoint> resolveGeometry(
            UpdateRouteDirectionsRequest.DirectionUpdateRequest dirReq,
            Map<UUID, List<GeometryPoint>> geometryByDirectionId,
            Map<String, List<GeometryPoint>> geometryByDirectionValue) {
        if (dirReq.getRoutePoints() != null) {
            List<GeometryPoint> submitted = new ArrayList<>();
            for (UpdateRouteDirectionsRequest.PointUpdateRequest pointReq : dirReq.getRoutePoints()) {
                submitted.add(new GeometryPoint(pointReq.getPointOrder(),
                        geometryFactory.createPoint(
                                new Coordinate(pointReq.getLongitude(), pointReq.getLatitude()))));
            }
            return submitted;
        }

        UUID directionId = parseUuid(dirReq.getId());
        List<GeometryPoint> preserved = directionId == null
                ? null : geometryByDirectionId.get(directionId);
        if (preserved == null) {
            preserved = geometryByDirectionValue.get(dirReq.getDirection());
        }
        return preserved == null ? List.of() : preserved;
    }

    private UUID parseStopId(String value) {
        return parseRequiredUuid(value, "stop id");
    }

    private UUID parseRequiredUuid(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Invalid " + label + ": value is required");
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid " + label + ": " + value);
        }
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private record GeometryPoint(Integer order, Point location) {
    }

    @Transactional
    public void delete(UUID id) {
        if (!routeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Route not found with id: " + id);
        }
        routeRepository.deleteById(id);
    }
}
