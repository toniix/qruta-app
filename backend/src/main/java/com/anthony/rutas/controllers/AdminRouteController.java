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
@RequestMapping("/api/admin/routes")
@RequiredArgsConstructor
public class AdminRouteController {

    private final RouteService routeService;

    @GetMapping("/")
    public ResponseEntity<List<AdminRouteSummaryResponse>> getAllRoutes() {
        return ResponseEntity.ok(routeService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RouteDetailResponse> getRouteById(@PathVariable UUID id) {
        return ResponseEntity.ok(routeService.findById(id));
    }

    @PostMapping("/")
    public ResponseEntity<RouteDetailResponse> createRoute(@Valid @RequestBody CreateRouteRequest request) {
        return ResponseEntity.ok(routeService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminRouteSummaryResponse> updateRoute(@PathVariable UUID id,
            @Valid @RequestBody UpdateRouteRequest request) {
        return ResponseEntity.ok(routeService.update(id, request));
    }

    @PutMapping("/{id}/directions")
    public ResponseEntity<RouteDetailResponse> updateRouteDirections(@PathVariable UUID id,
            @Valid @RequestBody UpdateRouteDirectionsRequest request) {
        return ResponseEntity.ok(routeService.updateDirections(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoute(@PathVariable UUID id) {
        routeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
