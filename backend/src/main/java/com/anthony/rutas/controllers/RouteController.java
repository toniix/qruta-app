package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @GetMapping("/routes")
    public ResponseEntity<List<RouteSummaryResponse>> getAllRoutes() {
        return ResponseEntity.ok(routeService.findAll());
    }

    @GetMapping("/routes/{id}")
    public ResponseEntity<RouteDetailResponse> getRouteById(@PathVariable Long id) {
        return ResponseEntity.ok(routeService.findById(id));
    }

    @GetMapping("/routes/search")
    public ResponseEntity<List<RouteSummaryResponse>> searchRoutes(@RequestParam String query) {
        return ResponseEntity.ok(routeService.search(query));
    }

    @GetMapping("/routes/line/{transportLineId}")
    public ResponseEntity<List<RouteSummaryResponse>> getRoutesByLine(@PathVariable Long transportLineId) {
        return ResponseEntity.ok(routeService.findByTransportLine(transportLineId));
    }
}
