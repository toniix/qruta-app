package com.anthony.rutas.dtos;

import com.anthony.rutas.dtos.request.CreateRouteRequest;
import com.anthony.rutas.dtos.request.CreateRouteRequest.RouteDirectionRequest;
import com.anthony.rutas.dtos.request.CreateRouteRequest.RoutePointItemRequest;
import com.anthony.rutas.dtos.request.CreateRouteRequest.RouteStopItemRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves that bean validation cascades into the nested directions payload
 * ({@code @Valid} on directions, stops and route points). Without the cascade,
 * an invalid nested object would reach the service layer unchecked.
 */
@DisplayName("CreateRouteRequest validation")
class CreateRouteRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    private final String lineId = UUID.randomUUID().toString();
    private final String stopId = UUID.randomUUID().toString();

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private Set<String> violatedPaths(CreateRouteRequest request) {
        return validator.validate(request).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    private CreateRouteRequest validRequest() {
        return CreateRouteRequest.builder()
                .transportLineId(lineId)
                .code("R101")
                .name("Huacachina - Centro")
                .category("MICRO")
                .directions(List.of(RouteDirectionRequest.builder()
                        .direction("IDA")
                        .originName("Terminal")
                        .destinationName("Plaza")
                        .totalDistanceKm(10.0)
                        .estimatedMinutes(30)
                        .stops(List.of(RouteStopItemRequest.builder()
                                .stopId(stopId)
                                .stopOrder(1)
                                .distanceFromStart(0.0)
                                .build()))
                        .routePoints(List.of(RoutePointItemRequest.builder()
                                .pointOrder(1)
                                .latitude(-14.06)
                                .longitude(-75.72)
                                .build()))
                        .build()))
                .build();
    }

    @Test
    @DisplayName("Should accept a complete wizard-shaped payload")
    void shouldAcceptValidRequest() {
        Set<ConstraintViolation<CreateRouteRequest>> violations = validator.validate(validRequest());

        assertTrue(violations.isEmpty(), () -> "Unexpected violations: " + violations);
    }

    @Test
    @DisplayName("Should reject blank top-level code")
    void shouldRejectBlankCode() {
        CreateRouteRequest request = validRequest();
        request.setCode("  ");

        assertTrue(violatedPaths(request).contains("code"));
    }

    @Test
    @DisplayName("Should cascade into directions")
    void shouldCascadeIntoDirections() {
        CreateRouteRequest request = validRequest();
        request.getDirections().get(0).setDirection("  ");

        assertTrue(violatedPaths(request).contains("directions[0].direction"));
    }

    @Test
    @DisplayName("Should cascade into stops")
    void shouldCascadeIntoStops() {
        CreateRouteRequest request = validRequest();
        request.getDirections().get(0).getStops().get(0).setStopId("");

        assertTrue(violatedPaths(request).contains("directions[0].stops[0].stopId"));
    }

    @Test
    @DisplayName("Should cascade into route points")
    void shouldCascadeIntoRoutePoints() {
        CreateRouteRequest request = validRequest();
        request.getDirections().get(0).getRoutePoints().get(0).setLatitude(null);

        assertTrue(violatedPaths(request).contains("directions[0].routePoints[0].latitude"));
    }

    @Test
    @DisplayName("Should reject coordinates outside WGS84 range")
    void shouldRejectOutOfRangeCoordinates() {
        CreateRouteRequest request = validRequest();
        request.getDirections().get(0).getRoutePoints().get(0).setLatitude(91.0);

        assertTrue(violatedPaths(request).contains("directions[0].routePoints[0].latitude"));
    }

    @Test
    @DisplayName("Should reject duplicate point order inside a direction")
    void shouldRejectDuplicatePointOrder() {
        CreateRouteRequest request = validRequest();
        RouteDirectionRequest direction = request.getDirections().get(0);
        direction.setRoutePoints(List.of(
                direction.getRoutePoints().get(0),
                RoutePointItemRequest.builder().pointOrder(1).latitude(-14.07).longitude(-75.73).build()));

        assertTrue(violatedPaths(request).contains("directions[0].pointOrderUnique"));
    }

    @Test
    @DisplayName("Should reject the same stop twice inside a direction")
    void shouldRejectDuplicateStop() {
        CreateRouteRequest request = validRequest();
        RouteDirectionRequest direction = request.getDirections().get(0);
        direction.setStops(List.of(
                direction.getStops().get(0),
                RouteStopItemRequest.builder().stopId(stopId).stopOrder(2).build()));

        assertTrue(violatedPaths(request).contains("directions[0].stopIdUnique"));
    }

    @Test
    @DisplayName("Should reject legacy direction values")
    void shouldRejectLegacyDirectionValue() {
        CreateRouteRequest request = validRequest();
        request.getDirections().get(0).setDirection("OUTBOUND");

        assertTrue(violatedPaths(request).contains("directions[0].direction"));
    }

    @Test
    @DisplayName("Should reject two directions with the same value")
    void shouldRejectDuplicateDirectionValue() {
        CreateRouteRequest request = validRequest();
        request.setDirections(List.of(
                request.getDirections().get(0),
                RouteDirectionRequest.builder().direction("IDA").build()));

        assertTrue(violatedPaths(request).contains("directionValuesUnique"));
    }
}
