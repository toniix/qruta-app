package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lines")
@RequiredArgsConstructor
public class TransportLineController {

    private final TransportLineService transportLineService;

    @GetMapping("/")
    public ResponseEntity<List<TransportLineResponse>> getAllLines() {
        return ResponseEntity.ok(transportLineService.findAll());
    }

    @GetMapping("/city/{cityId}")
    public ResponseEntity<List<TransportLineResponse>> getLinesByCity(@PathVariable UUID cityId) {
        return ResponseEntity.ok(transportLineService.findByCity(cityId));
    }
}
