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
@RequestMapping("/api/stops")
@RequiredArgsConstructor
public class StopController {

    private final StopService stopService;

    @GetMapping
    public ResponseEntity<List<StopResponse>> getAllStops() {
        return ResponseEntity.ok(stopService.findAll());
    }

    @GetMapping("/{idOrSlug}")
    public ResponseEntity<StopResponse> getStopById(@PathVariable String idOrSlug) {
        return ResponseEntity.ok(stopService.findByIdOrSlug(idOrSlug));
    }

    @GetMapping("/{idOrSlug}/routes")
    public ResponseEntity<List<StopRouteResponse>> getRoutesByStop(@PathVariable String idOrSlug) {
        return ResponseEntity.ok(stopService.findRoutesByStop(idOrSlug));
    }

    @GetMapping("/search")
    public ResponseEntity<List<StopResponse>> searchStops(@RequestParam String query) {
        return ResponseEntity.ok(stopService.search(query));
    }

    @PostMapping("/nearby")
    public ResponseEntity<List<StopResponse>> findNearbyStops(
            @Valid @RequestBody NearbySearchRequest request) {
        return ResponseEntity.ok(stopService.findNearbyStops(
                request.getLatitude(),
                request.getLongitude(),
                request.getRadiusMeters()));
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<StopResponse>> findNearbyStopsGet(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "1000") double radiusMeters) {
        return ResponseEntity.ok(stopService.findNearbyStops(latitude, longitude, radiusMeters));
    }
}
