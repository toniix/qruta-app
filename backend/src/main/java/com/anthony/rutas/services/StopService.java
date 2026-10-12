package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateStopRequest;
import com.anthony.rutas.dtos.request.UpdateStopRequest;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import com.anthony.rutas.repositories.StopRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StopService {

    private final StopRepository stopRepository;
    private final CityRepository cityRepository;
    private final RouteStopRepository routeStopRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory();

    @Transactional(readOnly = true)
    public List<StopResponse> findAll() {
        return DtoMapper.toStopList(stopRepository.findAllWithCity());
    }

    @Transactional(readOnly = true)
    public StopResponse findById(UUID id) {
        Stop stop = stopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found with id: " + id));
        return DtoMapper.toStopResponse(stop);
    }

    /**
     * Finds stops nearby a geographic coordinate within radius meters.
     */
    @Transactional(readOnly = true)
    public List<StopResponse> findNearbyStops(double latitude, double longitude, double radiusMeters) {
        List<Stop> nearbyStops = stopRepository.findNearby(latitude, longitude, radiusMeters);
        return DtoMapper.toStopList(nearbyStops);
    }

    /**
     * Returns all routes that pass through the given stop, grouped by route.
     * Each entry includes the distinct directions served (OUTBOUND/INBOUND)
     * and a derived label (IDA / VUELTA / IDA Y VUELTA) computed here, never
     * persisted.
     */
    @Transactional(readOnly = true)
    public List<StopRouteResponse> findRoutesByStop(UUID stopId) {
        // Resolve the stop first so a missing id still yields 404 rather than an
        // empty list. The route-stop query below then joins direction and route,
        // so dereferencing them costs no extra round trips.
        if (!stopRepository.existsById(stopId)) {
            throw new ResourceNotFoundException("Stop not found with id: " + stopId);
        }

        Map<UUID, Route> routesByRoute = new LinkedHashMap<>();
        Map<UUID, Set<String>> directionsByRoute = new LinkedHashMap<>();

        for (RouteStop routeStop : routeStopRepository.findWithDirectionAndRouteByStopId(stopId)) {
            Route route = routeStop.getDirection().getRoute();
            routesByRoute.putIfAbsent(route.getId(), route);
            directionsByRoute.computeIfAbsent(route.getId(), id -> new TreeSet<>())
                    .add(routeStop.getDirection().getDirection());
        }

        return routesByRoute.entrySet().stream()
                .map(entry -> {
                    Route route = entry.getValue();
                    List<String> directions = List.copyOf(directionsByRoute.get(entry.getKey()));
                    return DtoMapper.toStopRouteResponse(route, directions, resolveDirectionLabel(directions));
                })
                .toList();
    }

    private String resolveDirectionLabel(List<String> directions) {
        boolean hasOutbound = directions.contains("OUTBOUND");
        boolean hasInbound = directions.contains("INBOUND");
        if (hasOutbound && hasInbound) {
            return "IDA Y VUELTA";
        }
        return hasOutbound ? "IDA" : "VUELTA";
    }

    @Transactional(readOnly = true)
    public List<StopResponse> search(String query) {
        return DtoMapper.toStopList(stopRepository.findByNameContainingIgnoreCase(query));
    }

    @Transactional
    public StopResponse create(CreateStopRequest request) {
        City city = cityRepository.findById(UUID.fromString(request.getCityId()))
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + request.getCityId()));

        Point location = geometryFactory.createPoint(new Coordinate(request.getLongitude(), request.getLatitude()));

        Stop stop = Stop.builder()
                .city(city)
                .name(request.getName())
                .location(location)
                .reference(request.getReference())
                .address(request.getAddress())
                .isAccessible(request.getIsAccessible() != null ? request.getIsAccessible() : true)
                .build();

        return DtoMapper.toStopResponse(stopRepository.save(stop));
    }

    @Transactional
    public StopResponse update(UUID id, UpdateStopRequest request) {
        Stop stop = stopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found with id: " + id));

        if (request.getName() != null) stop.setName(request.getName());
        if (request.getLatitude() != null && request.getLongitude() != null) {
            Point location = geometryFactory.createPoint(new Coordinate(request.getLongitude(), request.getLatitude()));
            stop.setLocation(location);
        }
        if (request.getReference() != null) stop.setReference(request.getReference());
        if (request.getAddress() != null) stop.setAddress(request.getAddress());
        if (request.getIsAccessible() != null) stop.setAccessible(request.getIsAccessible());

        return DtoMapper.toStopResponse(stopRepository.save(stop));
    }

    @Transactional
    public void delete(UUID id) {
        if (!stopRepository.existsById(id)) {
            throw new ResourceNotFoundException("Stop not found with id: " + id);
        }
        stopRepository.deleteById(id);
    }
}
