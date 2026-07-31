package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.NearbySearchRequest;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.services.NearbyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NearbyController {

    private final NearbyService nearbyService;

    @PostMapping("/routes/nearby")
    public ResponseEntity<List<RouteSummaryResponse>> findNearbyRoutes(
            @Valid @RequestBody NearbySearchRequest request) {
        return ResponseEntity.ok(nearbyService.findNearbyRoutes(
                request.getLatitude(),
                request.getLongitude(),
                request.getRadiusMeters()));
    }

    @PostMapping("/stops/nearby")
    public ResponseEntity<List<StopResponse>> findNearbyStops(
            @Valid @RequestBody NearbySearchRequest request) {
        return ResponseEntity.ok(nearbyService.findNearbyStops(
                request.getLatitude(),
                request.getLongitude(),
                request.getRadiusMeters()));
    }
}
