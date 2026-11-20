package com.anthony.rutas.dtos;

import com.anthony.rutas.dtos.request.CreateTransportLineRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CreateTransportLineRequest validation")
class CreateTransportLineRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private Set<String> violatedPaths(CreateTransportLineRequest request) {
        return validator.validate(request).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    @Test
    @DisplayName("valid request with required company and cityId passes validation")
    void validRequestPasses() {
        CreateTransportLineRequest request = CreateTransportLineRequest.builder()
                .cityId(UUID.randomUUID().toString())
                .company("Empresa de Transportes Ica S.A.")
                .build();

        Set<ConstraintViolation<CreateTransportLineRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("missing company fails validation")
    void missingCompanyFails() {
        CreateTransportLineRequest request = CreateTransportLineRequest.builder()
                .cityId(UUID.randomUUID().toString())
                .company(null)
                .build();

        Set<String> paths = violatedPaths(request);
        assertTrue(paths.contains("company"));
    }

    @Test
    @DisplayName("blank company fails validation")
    void blankCompanyFails() {
        CreateTransportLineRequest request = CreateTransportLineRequest.builder()
                .cityId(UUID.randomUUID().toString())
                .company("   ")
                .build();

        Set<String> paths = violatedPaths(request);
        assertTrue(paths.contains("company"));
    }

    @Test
    @DisplayName("missing cityId fails validation")
    void missingCityIdFails() {
        CreateTransportLineRequest request = CreateTransportLineRequest.builder()
                .company("Empresa de Transportes Ica S.A.")
                .cityId(null)
                .build();

        Set<String> paths = violatedPaths(request);
        assertTrue(paths.contains("cityId"));
    }
}
