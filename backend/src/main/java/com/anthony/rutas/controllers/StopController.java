package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class StopController {

    private final StopService stopService;

    @GetMapping("/stops")
    public ResponseEntity<List<StopResponse>> getAllStops() {
        return ResponseEntity.ok(stopService.findAll());
    }

    @GetMapping("/stops/{id}")
    public ResponseEntity<StopResponse> getStopById(@PathVariable UUID id) {
        return ResponseEntity.ok(stopService.findById(id));
    }

    @GetMapping("/stops/{id}/routes")
    public ResponseEntity<List<StopRouteResponse>> getRoutesByStop(@PathVariable UUID id) {
        return ResponseEntity.ok(stopService.findRoutesByStop(id));
    }

    @GetMapping("/stops/search")
    public ResponseEntity<List<StopResponse>> searchStops(@RequestParam String query) {
        return ResponseEntity.ok(stopService.search(query));
    }
}
