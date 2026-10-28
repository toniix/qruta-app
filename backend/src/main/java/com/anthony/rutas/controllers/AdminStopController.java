package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.*;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.services.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/stops")
@RequiredArgsConstructor
public class AdminStopController {

    private final StopService stopService;

    @GetMapping
    public ResponseEntity<List<StopResponse>> getAllStops() {
        return ResponseEntity.ok(stopService.findAll());
    }

    @PostMapping
    public ResponseEntity<StopResponse> createStop(@Valid @RequestBody CreateStopRequest request) {
        return ResponseEntity.ok(stopService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StopResponse> updateStop(@PathVariable UUID id,
            @Valid @RequestBody UpdateStopRequest request) {
        return ResponseEntity.ok(stopService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStop(@PathVariable UUID id) {
        stopService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StopResponse> uploadStopImage(@PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(stopService.updateImage(id, file));
    }

    @DeleteMapping("/{id}/image")
    public ResponseEntity<StopResponse> removeStopImage(@PathVariable UUID id) {
        return ResponseEntity.ok(stopService.removeImage(id));
    }

    /**
     * Storage disabled (missing SUPABASE_URL / SUPABASE_SERVICE_KEY) is an
     * operational outage, not invalid input: 503 with the same error body shape
     * as {@code GlobalExceptionHandler}. Handled here because the advice's
     * catch-all {@code Exception} handler would otherwise surface it as 500.
     */
    @ExceptionHandler(SupabaseStorageService.StorageNotConfiguredException.class)
    public ResponseEntity<Map<String, Object>> handleStorageNotConfigured(
            SupabaseStorageService.StorageNotConfiguredException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.SERVICE_UNAVAILABLE.value());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }
}
