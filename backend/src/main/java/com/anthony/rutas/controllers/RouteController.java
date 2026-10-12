package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.NearbySearchRequest;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.services.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @GetMapping("/cards")
    public ResponseEntity<List<RouteSummaryResponse>> getRouteCards(
            @RequestParam(value = "cityId", required = false) UUID cityId) {
        return ResponseEntity.ok(cityId != null ? routeService.findAllCards(cityId) : routeService.findAllCards());
    }

    @GetMapping("/popular")
    public ResponseEntity<List<PopularRouteResponse>> getPopularRoutes(
            @RequestParam(value = "cityId", required = false) UUID cityId) {
        return ResponseEntity.ok(cityId != null ? routeService.findPopularRoutes(cityId) : routeService.findPopularRoutes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RouteDetailResponse> getRouteById(@PathVariable UUID id) {
        return ResponseEntity.ok(routeService.findById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<RouteSummaryResponse>> searchRoutes(
            @RequestParam String query,
            @RequestParam(value = "cityId", required = false) UUID cityId,
            @RequestParam(value = "size", required = false, defaultValue = "50") int size) {
        return ResponseEntity.ok(cityId != null
                ? routeService.search(query, cityId, size)
                : routeService.search(query, size));
    }

    @GetMapping("/line/{transportLineId}")
    public ResponseEntity<List<RouteSummaryResponse>> getRoutesByLine(@PathVariable UUID transportLineId) {
        return ResponseEntity.ok(routeService.findByTransportLine(transportLineId));
    }

    @PostMapping("/nearby")
    public ResponseEntity<List<RouteSummaryResponse>> findNearbyRoutes(
            @Valid @RequestBody NearbySearchRequest request) {
        return ResponseEntity.ok(routeService.findNearbyRoutes(
                request.getLatitude(),
                request.getLongitude(),
                request.getRadiusMeters()));
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<RouteSummaryResponse>> findNearbyRoutesGet(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "1500") double radiusMeters) {
        return ResponseEntity.ok(routeService.findNearbyRoutes(latitude, longitude, radiusMeters));
    }
}
