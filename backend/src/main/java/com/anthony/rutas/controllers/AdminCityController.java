package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.CreateCityRequest;
import com.anthony.rutas.dtos.response.CityResponse;
import com.anthony.rutas.services.CityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminCityController {

    private final CityService cityService;

    @GetMapping("/cities")
    public ResponseEntity<List<CityResponse>> getAllCities() {
        return ResponseEntity.ok(cityService.findAll());
    }

    @PostMapping("/cities")
    public ResponseEntity<CityResponse> createCity(@Valid @RequestBody CreateCityRequest request) {
        return ResponseEntity.ok(cityService.create(request));
    }

    @PutMapping("/cities/{id}")
    public ResponseEntity<CityResponse> updateCity(@PathVariable UUID id, @Valid @RequestBody CreateCityRequest request) {
        return ResponseEntity.ok(cityService.update(id, request));
    }

    @DeleteMapping("/cities/{id}")
    public ResponseEntity<Void> deleteCity(@PathVariable UUID id) {
        cityService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
