package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.LoginRequest;
import com.anthony.rutas.dtos.response.OperatorAuthResponse;
import com.anthony.rutas.services.OperatorAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/operator")
@RequiredArgsConstructor
public class OperatorAuthController {

    private final OperatorAuthService operatorAuthService;

    @PostMapping("/login")
    public ResponseEntity<OperatorAuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(operatorAuthService.login(request));
    }
}
