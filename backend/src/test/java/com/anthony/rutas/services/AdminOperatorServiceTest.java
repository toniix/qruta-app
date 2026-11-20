package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateOperatorRequest;
import com.anthony.rutas.dtos.request.CreateOperatorUserRequest;
import com.anthony.rutas.dtos.request.ResetPasswordRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorRequest;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.OperatorUser;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.OperatorUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminOperatorServiceTest {

    private static final UUID OPERATOR_ID = UUID.randomUUID();
    private static final UUID CITY_ID = UUID.randomUUID();

    @Mock
    private OperatorRepository operatorRepository;
    @Mock
    private OperatorUserRepository operatorUserRepository;
    @Mock
    private CityRepository cityRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminOperatorService service;

    @BeforeEach
    void setUp() {
        service = new AdminOperatorService(operatorRepository, operatorUserRepository, cityRepository, passwordEncoder);
    }

    private City city() {
        return City.builder().id(CITY_ID).name("Ica").build();
    }

    private Operator operator() {
        return Operator.builder()
                .id(OPERATOR_ID)
                .name("Expreso Ica")
                .ruc("20512345678")
                .city(city())
                .plan("PRO")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("create persists an active operator with the requested plan and resolves its city")
    void createsOperator() {
        when(operatorRepository.existsByRucIgnoreCase(anyString())).thenReturn(false);
        when(cityRepository.findById(CITY_ID)).thenReturn(Optional.of(city()));
        when(operatorRepository.save(any(Operator.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.create(CreateOperatorRequest.builder()
                .name("Expreso Ica")
                .ruc("20512345678")
                .cityId(CITY_ID.toString())
                .plan("ENTERPRISE")
                .build());

        assertThat(response.isActive()).isTrue();
        assertThat(response.getPlan()).isEqualTo("ENTERPRISE");
        assertThat(response.getCityName()).isEqualTo("Ica");

        ArgumentCaptor<Operator> saved = ArgumentCaptor.forClass(Operator.class);
        verify(operatorRepository).save(saved.capture());
        assertThat(saved.getValue().isActive()).isTrue();
    }

    @Test
    @DisplayName("create rejects a duplicated RUC with a validation error")
    void rejectsDuplicatedRuc() {
        when(operatorRepository.existsByRucIgnoreCase("20512345678")).thenReturn(true);

        assertThatThrownBy(() -> service.create(CreateOperatorRequest.builder()
                .name("Expreso Ica")
                .ruc("20512345678")
                .cityId(CITY_ID.toString())
                .build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("RUC");

        verify(operatorRepository, never()).save(any());
    }

    @Test
    @DisplayName("update applies active flag and rejects a RUC owned by another operator")
    void updatesOperatorAndRejectsForeignRuc() {
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(operatorRepository.existsByRucIgnoreCaseAndIdNot("20999999999", OPERATOR_ID)).thenReturn(true);

        assertThatThrownBy(() -> service.update(OPERATOR_ID, UpdateOperatorRequest.builder()
                .ruc("20999999999")
                .build()))
                .isInstanceOf(BadRequestException.class);

        when(operatorRepository.save(any(Operator.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.setActive(OPERATOR_ID, false);

        assertThat(response.isActive()).isFalse();
    }

    @Test
    @DisplayName("setActive reactivates a deactivated operator")
    void reactivatesOperator() {
        Operator inactive = operator();
        inactive.setActive(false);
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(inactive));
        when(operatorRepository.save(any(Operator.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.setActive(OPERATOR_ID, true).isActive()).isTrue();
    }

    @Test
    @DisplayName("deactivating an operator never deletes the row (soft delete)")
    void deactivateDoesNotDelete() {
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(operatorRepository.save(any(Operator.class))).thenAnswer(inv -> inv.getArgument(0));

        service.setActive(OPERATOR_ID, false);

        verify(operatorRepository, never()).deleteById(any());
        verify(operatorRepository, never()).delete(any());
    }

    @Test
    @DisplayName("createUser encodes the password and defaults to EDITOR")
    void createsOperatorUser() {
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(operatorUserRepository.existsByEmailIgnoreCase("owner@expreso.pe")).thenReturn(false);
        when(passwordEncoder.encode("secret")).thenReturn("bcrypt-hash");
        when(operatorUserRepository.save(any(OperatorUser.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.createUser(OPERATOR_ID, CreateOperatorUserRequest.builder()
                .email("owner@expreso.pe")
                .fullName("Ana Owner")
                .password("secret")
                .build());

        assertThat(response.getRole()).isEqualTo("EDITOR");
        assertThat(response.isActive()).isTrue();

        ArgumentCaptor<OperatorUser> saved = ArgumentCaptor.forClass(OperatorUser.class);
        verify(operatorUserRepository).save(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("bcrypt-hash");
        assertThat(saved.getValue().getPasswordHash()).isNotEqualTo("secret");
    }

    @Test
    @DisplayName("createUser rejects a duplicated email and does not persist")
    void rejectsDuplicatedEmail() {
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(operatorUserRepository.existsByEmailIgnoreCase("owner@expreso.pe")).thenReturn(true);

        assertThatThrownBy(() -> service.createUser(OPERATOR_ID, CreateOperatorUserRequest.builder()
                .email("owner@expreso.pe")
                .fullName("Ana Owner")
                .role("OWNER")
                .password("secret")
                .build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("correo");

        verify(operatorUserRepository, never()).save(any());
    }

    @Test
    @DisplayName("resetPassword replaces the stored hash")
    void resetsPassword() {
        OperatorUser user = OperatorUser.builder()
                .id(UUID.randomUUID())
                .operator(operator())
                .email("owner@expreso.pe")
                .fullName("Ana Owner")
                .role("OWNER")
                .passwordHash("old-hash")
                .active(true)
                .build();
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(operatorUserRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("nuevo")).thenReturn("new-hash");
        when(operatorUserRepository.save(any(OperatorUser.class))).thenAnswer(inv -> inv.getArgument(0));

        service.resetPassword(OPERATOR_ID, user.getId(), ResetPasswordRequest.builder().password("nuevo").build());

        ArgumentCaptor<OperatorUser> saved = ArgumentCaptor.forClass(OperatorUser.class);
        verify(operatorUserRepository).save(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("new-hash");
    }

    @Test
    @DisplayName("findUsers only lists users of the given operator and fails on unknown operator")
    void findsUsersScopedToOperator() {
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        OperatorUser owner = OperatorUser.builder().id(UUID.randomUUID()).operator(operator())
                .email("owner@expreso.pe").fullName("Ana Owner").role("OWNER").active(true).build();
        when(operatorUserRepository.findByOperatorId(OPERATOR_ID)).thenReturn(List.of(owner));

        assertThat(service.findUsers(OPERATOR_ID)).hasSize(1);
        assertThat(service.findUsers(OPERATOR_ID).get(0).getEmail()).isEqualTo("owner@expreso.pe");

        UUID unknownOperatorId = UUID.randomUUID();
        when(operatorRepository.findById(unknownOperatorId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.findUsers(unknownOperatorId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
