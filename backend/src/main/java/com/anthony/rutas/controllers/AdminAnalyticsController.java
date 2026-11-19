package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.response.AnalyticsOverviewResponse;
import com.anthony.rutas.dtos.response.RouteAnalyticsSeriesResponse;
import com.anthony.rutas.services.RouteAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/** Admin-only usage analytics. Every endpoint requires the ADMIN role (SecurityConfig). */
@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final RouteAnalyticsService routeAnalyticsService;

    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewResponse> overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(29);
        return ResponseEntity.ok(routeAnalyticsService.overview(effectiveFrom, effectiveTo));
    }

    @GetMapping("/routes/{routeId}")
    public ResponseEntity<RouteAnalyticsSeriesResponse> routeSeries(
            @PathVariable UUID routeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(29);
        return ResponseEntity.ok(routeAnalyticsService.routeSeries(routeId, effectiveFrom, effectiveTo));
    }

    /**
     * HTTP-invokable aggregation job (Cloud Scheduler calls this). No embedded scheduler:
     * the job is a plain service call behind an admin-only endpoint.
     */
    @PostMapping("/aggregate")
    public ResponseEntity<Map<String, String>> aggregate(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) UUID cityId) {
        LocalDate target = date != null ? date : LocalDate.now().minusDays(1);
        routeAnalyticsService.aggregateDay(target, cityId);
        return ResponseEntity.ok(Map.of("aggregatedFor", target.toString()));
    }
}
