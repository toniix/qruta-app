package com.anthony.rutas.dtos;

import com.anthony.rutas.dtos.request.NearbySearchRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("NearbySearchRequest validation")
class NearbySearchRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private Set<String> violatedFields(NearbySearchRequest request) {
        return validator.validate(request).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    @Test
    @DisplayName("Should accept valid coordinates and radius")
    void shouldAcceptValidRequest() {
        NearbySearchRequest request = new NearbySearchRequest(-34.9215, -57.9545, 1500.0);

        Set<ConstraintViolation<NearbySearchRequest>> violations = validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("Should accept null radius as optional")
    void shouldAcceptNullRadius() {
        NearbySearchRequest request = new NearbySearchRequest(-34.9215, -57.9545, null);

        Set<ConstraintViolation<NearbySearchRequest>> violations = validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject out-of-range latitude")
    void shouldRejectOutOfRangeLatitude() {
        NearbySearchRequest request = new NearbySearchRequest(91.0, -57.9545, 1500.0);

        assertEquals(Set.of("latitude"), violatedFields(request));
    }

    @Test
    @DisplayName("Should reject out-of-range longitude")
    void shouldRejectOutOfRangeLongitude() {
        NearbySearchRequest request = new NearbySearchRequest(-34.9215, 181.0, 1500.0);

        assertEquals(Set.of("longitude"), violatedFields(request));
    }

    @Test
    @DisplayName("Should reject non-positive radius")
    void shouldRejectNonPositiveRadius() {
        NearbySearchRequest request = new NearbySearchRequest(-34.9215, -57.9545, 0.0);

        assertEquals(Set.of("radiusMeters"), violatedFields(request));
    }

    @Test
    @DisplayName("Should reject radius above maximum")
    void shouldRejectRadiusAboveMaximum() {
        NearbySearchRequest request = new NearbySearchRequest(-34.9215, -57.9545, 100001.0);

        assertEquals(Set.of("radiusMeters"), violatedFields(request));
    }

    @Test
    @DisplayName("Should accept boundary values")
    void shouldAcceptBoundaryValues() {
        assertTrue(validator.validate(new NearbySearchRequest(-90.0, -180.0, 0.001)).isEmpty());
        assertTrue(validator.validate(new NearbySearchRequest(90.0, 180.0, 100000.0)).isEmpty());
    }
}
