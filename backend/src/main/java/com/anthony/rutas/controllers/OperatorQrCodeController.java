package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.CreateQrCodeRequest;
import com.anthony.rutas.dtos.request.UpdateQrCodeRequest;
import com.anthony.rutas.dtos.response.QrCodeResponse;
import com.anthony.rutas.dtos.response.QrCodeStatsResponse;
import com.anthony.rutas.security.OperatorScope;
import com.anthony.rutas.services.SmartQrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/operator/qr-codes")
@RequiredArgsConstructor
public class OperatorQrCodeController {

    private final SmartQrService smartQrService;
    private final OperatorScope operatorScope;

    @GetMapping
    public ResponseEntity<List<QrCodeResponse>> list() {
        UUID operatorId = operatorScope.requireOperatorId();
        return ResponseEntity.ok(smartQrService.listForOperator(operatorId));
    }

    @PostMapping
    public ResponseEntity<QrCodeResponse> create(@Valid @RequestBody CreateQrCodeRequest request) {
        UUID operatorId = operatorScope.requireOperatorId();
        return ResponseEntity.status(HttpStatus.CREATED).body(smartQrService.createForOperator(operatorId, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QrCodeResponse> getById(@PathVariable UUID id) {
        UUID operatorId = operatorScope.requireOperatorId();
        return ResponseEntity.ok(smartQrService.getByIdForOperator(id, operatorId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<QrCodeResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateQrCodeRequest request) {
        UUID operatorId = operatorScope.requireOperatorId();
        return ResponseEntity.ok(smartQrService.updateForOperator(id, operatorId, request));
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<QrCodeStatsResponse> stats(@PathVariable UUID id) {
        UUID operatorId = operatorScope.requireOperatorId();
        return ResponseEntity.ok(smartQrService.getStatsForOperator(id, operatorId));
    }
}
