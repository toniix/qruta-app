package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.response.DataCoverageResponse;
import com.anthony.rutas.dtos.response.OdMatrixResponse;
import com.anthony.rutas.services.DataLicensingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/data/v1")
@RequiredArgsConstructor
public class DataLicensingController {

    private final DataLicensingService dataLicensingService;

    @GetMapping("/coverage/{citySlug:[^.]+}")
    public ResponseEntity<DataCoverageResponse> coverage(
            @RequestHeader("X-Api-Key") String apiKey,
            @PathVariable String citySlug) {
        return ResponseEntity.ok(dataLicensingService.coverage(apiKey, citySlug));
    }

    @GetMapping("/od-matrix/{citySlug:[^.]+}")
    public ResponseEntity<OdMatrixResponse> odMatrix(
            @RequestHeader("X-Api-Key") String apiKey,
            @PathVariable String citySlug) {
        return ResponseEntity.ok(dataLicensingService.odMatrix(apiKey, citySlug));
    }
}
