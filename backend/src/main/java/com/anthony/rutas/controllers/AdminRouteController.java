package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.*;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.services.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminRouteController {

    private final RouteService routeService;

    @GetMapping("/routes")
    public ResponseEntity<List<RouteSummaryResponse>> getAllRoutes() {
        return ResponseEntity.ok(routeService.findAll());
    }

    @GetMapping("/routes/{id}")
    public ResponseEntity<RouteDetailResponse> getRouteById(@PathVariable UUID id) {
        return ResponseEntity.ok(routeService.findById(id));
    }

    @PostMapping("/routes")
    public ResponseEntity<RouteDetailResponse> createRoute(@Valid @RequestBody CreateRouteRequest request) {
        return ResponseEntity.ok(routeService.create(request));
    }

    @PutMapping("/routes/{id}")
    public ResponseEntity<RouteSummaryResponse> updateRoute(@PathVariable UUID id,
                                                             @Valid @RequestBody UpdateRouteRequest request) {
        return ResponseEntity.ok(routeService.update(id, request));
    }

    @PutMapping("/routes/{id}/directions")
    public ResponseEntity<RouteDetailResponse> updateRouteDirections(@PathVariable UUID id,
                                                                      @Valid @RequestBody UpdateRouteDirectionsRequest request) {
        return ResponseEntity.ok(routeService.updateDirections(id, request));
    }

    @DeleteMapping("/routes/{id}")
    public ResponseEntity<Void> deleteRoute(@PathVariable UUID id) {
        routeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
