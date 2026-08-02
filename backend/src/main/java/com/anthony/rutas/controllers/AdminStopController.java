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
public class AdminStopController {

    private final StopService stopService;

    @GetMapping("/stops")
    public ResponseEntity<List<StopResponse>> getAllStops() {
        return ResponseEntity.ok(stopService.findAll());
    }

    @PostMapping("/stops")
    public ResponseEntity<StopResponse> createStop(@Valid @RequestBody CreateStopRequest request) {
        return ResponseEntity.ok(stopService.create(request));
    }

    @PutMapping("/stops/{id}")
    public ResponseEntity<StopResponse> updateStop(@PathVariable UUID id,
                                                    @Valid @RequestBody UpdateStopRequest request) {
        return ResponseEntity.ok(stopService.update(id, request));
    }

    @DeleteMapping("/stops/{id}")
    public ResponseEntity<Void> deleteStop(@PathVariable UUID id) {
        stopService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
