package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.AnalyticsEventBatchRequest;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.services.RouteAnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public, unauthenticated event ingestion. The payload carries no personal data; the
 * device id is hashed server-side before it touches storage.
 */
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    /** Hard cap on the raw JSON body, independent of the per-list size limit. */
    static final long MAX_PAYLOAD_BYTES = 64 * 1024;

    private final RouteAnalyticsService routeAnalyticsService;

    @PostMapping("/events")
    public ResponseEntity<Map<String, Integer>> ingest(
            @Valid @RequestBody AnalyticsEventBatchRequest request,
            HttpServletRequest httpRequest) {

        if (httpRequest.getContentLengthLong() > MAX_PAYLOAD_BYTES) {
            throw new BadRequestException("Payload exceeds the maximum accepted size of 64 KB");
        }

        int accepted = routeAnalyticsService.ingest(request);
        return ResponseEntity.accepted().body(Map.of("accepted", accepted));
    }
}
