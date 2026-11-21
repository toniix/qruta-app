package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.CreateQrCodeRequest;
import com.anthony.rutas.dtos.request.UpdateQrCodeRequest;
import com.anthony.rutas.dtos.response.QrCodeResponse;
import com.anthony.rutas.dtos.response.QrCodeStatsResponse;
import com.anthony.rutas.services.SmartQrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/qr-codes")
@RequiredArgsConstructor
public class AdminQrCodeController {

    private final SmartQrService smartQrService;

    @GetMapping
    public ResponseEntity<List<QrCodeResponse>> list() {
        return ResponseEntity.ok(smartQrService.listAll());
    }

    @PostMapping
    public ResponseEntity<QrCodeResponse> create(@Valid @RequestBody CreateQrCodeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(smartQrService.createForAdmin(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QrCodeResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(smartQrService.getById(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<QrCodeResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateQrCodeRequest request) {
        return ResponseEntity.ok(smartQrService.updateStatus(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        smartQrService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<QrCodeStatsResponse> stats(@PathVariable UUID id) {
        return ResponseEntity.ok(smartQrService.getStats(id));
    }
}
