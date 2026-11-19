package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.CreateDisruptionRequest;
import com.anthony.rutas.dtos.request.UpdateDisruptionRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorLineRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorRouteRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.dtos.request.UpdateStopRequest;
import com.anthony.rutas.dtos.response.ChangeLogResponse;
import com.anthony.rutas.dtos.response.DisruptionResponse;
import com.anthony.rutas.dtos.response.OperatorAnalyticsSummaryResponse;
import com.anthony.rutas.dtos.response.OperatorLineResponse;
import com.anthony.rutas.dtos.response.OperatorProfileResponse;
import com.anthony.rutas.dtos.response.OperatorRouteResponse;
import com.anthony.rutas.dtos.response.OperatorStopResponse;
import com.anthony.rutas.dtos.response.RouteAnalyticsSeriesResponse;
import com.anthony.rutas.dtos.response.RouteDetailResponse;
import com.anthony.rutas.dtos.response.SubscriptionResponse;
import com.anthony.rutas.services.OperatorPortalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/operator")
@RequiredArgsConstructor
public class OperatorPortalController {

    private final OperatorPortalService operatorPortalService;

    @GetMapping("/me")
    public ResponseEntity<OperatorProfileResponse> me() {
        return ResponseEntity.ok(operatorPortalService.getProfile());
    }

    @GetMapping("/profile")
    public ResponseEntity<OperatorProfileResponse> profile() {
        return ResponseEntity.ok(operatorPortalService.getProfile());
    }

    @GetMapping("/subscription")
    public ResponseEntity<SubscriptionResponse> subscription() {
        return ResponseEntity.ok(operatorPortalService.getSubscription());
    }

    @GetMapping("/analytics/summary")
    public ResponseEntity<OperatorAnalyticsSummaryResponse> analyticsSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(operatorPortalService.getAnalyticsSummary(from, to));
    }

    @GetMapping("/analytics/routes/{routeId}")
    public ResponseEntity<RouteAnalyticsSeriesResponse> routeAnalytics(
            @PathVariable UUID routeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(operatorPortalService.getRouteAnalytics(routeId, from, to));
    }

    @GetMapping("/lines")
    public ResponseEntity<List<OperatorLineResponse>> lines() {
        return ResponseEntity.ok(operatorPortalService.getLines());
    }

    @PutMapping("/lines/{id}")
    public ResponseEntity<OperatorLineResponse> updateLine(@PathVariable UUID id,
            @Valid @RequestBody UpdateOperatorLineRequest request) {
        return ResponseEntity.ok(operatorPortalService.updateLine(id, request));
    }

    @GetMapping("/routes")
    public ResponseEntity<List<OperatorRouteResponse>> routes() {
        return ResponseEntity.ok(operatorPortalService.getRoutes());
    }

    @GetMapping("/routes/{id}")
    public ResponseEntity<RouteDetailResponse> route(@PathVariable UUID id) {
        return ResponseEntity.ok(operatorPortalService.getRouteById(id));
    }

    @PutMapping("/routes/{id}")
    public ResponseEntity<OperatorRouteResponse> updateRoute(@PathVariable UUID id,
            @Valid @RequestBody UpdateOperatorRouteRequest request) {
        return ResponseEntity.ok(operatorPortalService.updateRoute(id, request));
    }

    @PutMapping("/routes/{id}/directions")
    public ResponseEntity<RouteDetailResponse> updateRouteDirections(@PathVariable UUID id,
            @Valid @RequestBody UpdateRouteDirectionsRequest request) {
        return ResponseEntity.ok(operatorPortalService.updateRouteDirections(id, request));
    }

    @GetMapping("/stops")
    public ResponseEntity<List<OperatorStopResponse>> stops() {
        return ResponseEntity.ok(operatorPortalService.getStops());
    }

    @PutMapping("/stops/{id}")
    public ResponseEntity<OperatorStopResponse> updateStop(@PathVariable UUID id,
            @Valid @RequestBody UpdateStopRequest request) {
        return ResponseEntity.ok(operatorPortalService.updateStop(id, request));
    }

    @GetMapping("/disruptions")
    public ResponseEntity<List<DisruptionResponse>> disruptions() {
        return ResponseEntity.ok(operatorPortalService.getDisruptions());
    }

    @PostMapping("/disruptions")
    public ResponseEntity<DisruptionResponse> createDisruption(
            @Valid @RequestBody CreateDisruptionRequest request) {
        return ResponseEntity.ok(operatorPortalService.createDisruption(request));
    }

    @PutMapping("/disruptions/{id}")
    public ResponseEntity<DisruptionResponse> updateDisruption(@PathVariable UUID id,
            @Valid @RequestBody UpdateDisruptionRequest request) {
        return ResponseEntity.ok(operatorPortalService.updateDisruption(id, request));
    }

    @DeleteMapping("/disruptions/{id}")
    public ResponseEntity<Void> deleteDisruption(@PathVariable UUID id) {
        operatorPortalService.deleteDisruption(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/changes")
    public ResponseEntity<List<ChangeLogResponse>> changes() {
        return ResponseEntity.ok(operatorPortalService.getChangeLogs());
    }
}
