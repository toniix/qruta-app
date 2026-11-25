package com.anthony.rutas.dtos;

import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest.DirectionUpdateRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest.PointUpdateRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest.StopUpdateRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("UpdateRouteDirectionsRequest validation")
class UpdateRouteDirectionsRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    private final String stopId = UUID.randomUUID().toString();

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    private UpdateRouteDirectionsRequest request(DirectionUpdateRequest direction) {
        return UpdateRouteDirectionsRequest.builder().directions(List.of(direction)).build();
    }

    private DirectionUpdateRequest direction() {
        return DirectionUpdateRequest.builder()
                .direction("IDA")
                .stops(List.of(StopUpdateRequest.builder().stopId(stopId).stopOrder(1).build()))
                .routePoints(List.of(PointUpdateRequest.builder().pointOrder(1).latitude(-14.06).longitude(-75.72).build()))
                .build();
    }

    private Set<String> paths(UpdateRouteDirectionsRequest request) {
        return validator.validate(request).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    @Test
    @DisplayName("Accepts a canonical direction")
    void acceptsCanonicalDirection() {
        assertTrue(paths(request(direction())).isEmpty());
    }

    @Test
    @DisplayName("Legacy direction values are rejected")
    void rejectsLegacyDirection() {
        DirectionUpdateRequest direction = direction();
        direction.setDirection("INBOUND");
        assertTrue(paths(request(direction)).contains("directions[0].direction"));
    }

    @Test
    @DisplayName("Duplicate point order is rejected")
    void rejectsDuplicatePointOrder() {
        DirectionUpdateRequest direction = direction();
        direction.setRoutePoints(List.of(
                PointUpdateRequest.builder().pointOrder(1).latitude(-14.06).longitude(-75.72).build(),
                PointUpdateRequest.builder().pointOrder(1).latitude(-14.07).longitude(-75.73).build()));
        assertTrue(paths(request(direction)).contains("directions[0].pointOrderUnique"));
    }

    @Test
    @DisplayName("Repeated stop in one direction is rejected")
    void rejectsRepeatedStop() {
        DirectionUpdateRequest direction = direction();
        direction.setStops(List.of(
                StopUpdateRequest.builder().stopId(stopId).stopOrder(1).build(),
                StopUpdateRequest.builder().stopId(stopId).stopOrder(2).build()));
        assertTrue(paths(request(direction)).contains("directions[0].stopIdUnique"));
    }

    @Test
    @DisplayName("Null and empty points are both valid at the DTO level")
    void acceptsNullAndEmptyPoints() {
        DirectionUpdateRequest nullPoints = direction();
        nullPoints.setRoutePoints(null);
        assertTrue(paths(request(nullPoints)).isEmpty());

        DirectionUpdateRequest emptyPoints = direction();
        emptyPoints.setRoutePoints(List.of());
        assertTrue(paths(request(emptyPoints)).isEmpty());
    }
}
