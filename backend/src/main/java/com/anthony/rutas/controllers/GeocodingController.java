package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.response.ReverseGeocodeResponse;
import com.anthony.rutas.services.ReverseGeocodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/geocode")
@RequiredArgsConstructor
// Enables Boot's Caffeine CacheManager auto-configuration (used by
// ReverseGeocodeService via the Spring Cache API). Lives here instead of the
// application class to stay within this task's allowed edit surfaces.
@EnableCaching
public class GeocodingController {

    private final ReverseGeocodeService reverseGeocodeService;

    /**
     * Thin proxy: nullable params so missing values reach service validation
     * (which throws {@code BadRequestException} -> 400) instead of failing as
     * missing-parameter 500s.
     */
    @GetMapping("/reverse")
    public ResponseEntity<ReverseGeocodeResponse> reverse(
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lng", required = false) Double lng) {
        return ResponseEntity.ok(reverseGeocodeService.reverseGeocode(lat, lng));
    }

    /**
     * Provider outage is not invalid input: both providers down -> 503 with the
     * same error body shape as {@code GlobalExceptionHandler}.
     */
    @ExceptionHandler(ReverseGeocodeService.UpstreamUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleUpstreamUnavailable(
            ReverseGeocodeService.UpstreamUnavailableException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.SERVICE_UNAVAILABLE.value());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }
}
