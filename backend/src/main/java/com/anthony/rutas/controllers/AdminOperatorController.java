package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.CreateOperatorRequest;
import com.anthony.rutas.dtos.request.CreateOperatorUserRequest;
import com.anthony.rutas.dtos.request.ResetPasswordRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorUserRequest;
import com.anthony.rutas.dtos.response.OperatorResponse;
import com.anthony.rutas.dtos.response.OperatorUserResponse;
import com.anthony.rutas.services.AdminOperatorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Platform-admin management of operators and their portal users. All routes sit
 * under {@code /api/admin/**}, so SecurityConfig requires the ADMIN role.
 */
@RestController
@RequestMapping("/api/admin/operators")
@RequiredArgsConstructor
public class AdminOperatorController {

    private final AdminOperatorService adminOperatorService;

    @GetMapping
    public ResponseEntity<List<OperatorResponse>> getAllOperators() {
        return ResponseEntity.ok(adminOperatorService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OperatorResponse> getOperator(@PathVariable UUID id) {
        return ResponseEntity.ok(adminOperatorService.findById(id));
    }

    @PostMapping
    public ResponseEntity<OperatorResponse> createOperator(@Valid @RequestBody CreateOperatorRequest request) {
        return ResponseEntity.ok(adminOperatorService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OperatorResponse> updateOperator(@PathVariable UUID id,
            @Valid @RequestBody UpdateOperatorRequest request) {
        return ResponseEntity.ok(adminOperatorService.update(id, request));
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<OperatorResponse> setOperatorActive(@PathVariable UUID id,
            @RequestBody Map<String, Boolean> body) {
        Boolean active = body.get("active");
        if (active == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(adminOperatorService.setActive(id, active));
    }

    // ── Operator users ───────────────────────────────────────────────────────

    @GetMapping("/{id}/users")
    public ResponseEntity<List<OperatorUserResponse>> getOperatorUsers(@PathVariable UUID id) {
        return ResponseEntity.ok(adminOperatorService.findUsers(id));
    }

    @PostMapping("/{id}/users")
    public ResponseEntity<OperatorUserResponse> createOperatorUser(@PathVariable UUID id,
            @Valid @RequestBody CreateOperatorUserRequest request) {
        return ResponseEntity.ok(adminOperatorService.createUser(id, request));
    }

    @PutMapping("/{id}/users/{userId}")
    public ResponseEntity<OperatorUserResponse> updateOperatorUser(@PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateOperatorUserRequest request) {
        return ResponseEntity.ok(adminOperatorService.updateUser(id, userId, request));
    }

    @PostMapping("/{id}/users/{userId}/reset-password")
    public ResponseEntity<OperatorUserResponse> resetOperatorUserPassword(@PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(adminOperatorService.resetPassword(id, userId, request));
    }

    @PatchMapping("/{id}/users/{userId}/active")
    public ResponseEntity<OperatorUserResponse> setOperatorUserActive(@PathVariable UUID id,
            @PathVariable UUID userId,
            @RequestBody Map<String, Boolean> body) {
        Boolean active = body.get("active");
        if (active == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(adminOperatorService.setUserActive(id, userId, active));
    }
}