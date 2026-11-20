package com.anthony.rutas.controllers;

import com.anthony.rutas.services.SmartQrService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/q")
@RequiredArgsConstructor
public class PublicQrController {

    private final SmartQrService smartQrService;

    @GetMapping("/{code}")
    public ResponseEntity<Void> resolve(
            @PathVariable String code,
            HttpServletRequest request) {
        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = request.getRemoteAddr();
        }
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        String clientIdentifier = clientIp + "|" + (userAgent != null ? userAgent : "");

        SmartQrService.ResolvedRedirect result = smartQrService.resolveAndTrack(code, clientIdentifier);

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(result.redirectUrl()))
                .build();
    }
}
