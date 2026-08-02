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
public class AdminLineController {

    private final TransportLineService transportLineService;

    @GetMapping("/lines")
    public ResponseEntity<List<TransportLineResponse>> getAllLines() {
        return ResponseEntity.ok(transportLineService.findAll());
    }

    @PostMapping("/lines")
    public ResponseEntity<TransportLineResponse> createLine(@Valid @RequestBody CreateTransportLineRequest request) {
        return ResponseEntity.ok(transportLineService.create(request));
    }

    @PutMapping("/lines/{id}")
    public ResponseEntity<TransportLineResponse> updateLine(@PathVariable UUID id,
                                                            @Valid @RequestBody UpdateTransportLineRequest request) {
        return ResponseEntity.ok(transportLineService.update(id, request));
    }

    @DeleteMapping("/lines/{id}")
    public ResponseEntity<Void> deleteLine(@PathVariable UUID id) {
        transportLineService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
