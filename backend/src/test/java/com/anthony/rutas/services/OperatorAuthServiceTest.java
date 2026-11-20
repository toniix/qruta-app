package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.LoginRequest;
import com.anthony.rutas.dtos.response.OperatorAuthResponse;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.OperatorUser;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.repositories.OperatorUserRepository;
import com.anthony.rutas.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OperatorAuthServiceTest {

    private static final UUID OPERATOR_ID = UUID.randomUUID();

    @Mock
    private OperatorUserRepository operatorUserRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;

    private OperatorAuthService service;

    @BeforeEach
    void setUp() {
        service = new OperatorAuthService(operatorUserRepository, passwordEncoder, jwtUtil);
    }

    private LoginRequest loginRequest(String email, String password) {
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private OperatorUser activeOwner() {
        Operator operator = Operator.builder().id(OPERATOR_ID).name("Expreso Ica").active(true).build();
        return OperatorUser.builder()
                .id(UUID.randomUUID())
                .operator(operator)
                .email("owner@expreso.pe")
                .fullName("Ana Owner")
                .role("OWNER")
                .passwordHash("bcrypt-hash")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("login returns the portal session role, not the business role, so the frontend guard accepts it")
    void returnsPortalSessionRole() {
        OperatorUser user = activeOwner();
        when(operatorUserRepository.findByEmailWithOperator("owner@expreso.pe")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "bcrypt-hash")).thenReturn(true);
        when(jwtUtil.generateToken("owner@expreso.pe", "ROLE_OPERATOR", OPERATOR_ID))
                .thenReturn("token");

        OperatorAuthResponse response = service.login(loginRequest("owner@expreso.pe", "secret"));

        assertThat(response.getRole()).isEqualTo("ROLE_OPERATOR");
        assertThat(response.getToken()).isEqualTo("token");
        assertThat(response.getOperatorId()).isEqualTo(OPERATOR_ID);
        assertThat(response.getOperatorName()).isEqualTo("Expreso Ica");
    }

    @Test
    @DisplayName("login rejects credentials for a deactivated operator")
    void rejectsDeactivatedOperator() {
        Operator operator = Operator.builder().id(OPERATOR_ID).name("Expreso Ica").active(false).build();
        OperatorUser user = activeOwner();
        user.setOperator(operator);
        when(operatorUserRepository.findByEmailWithOperator("owner@expreso.pe")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.login(loginRequest("owner@expreso.pe", "secret")))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("login rejects wrong passwords")
    void rejectsWrongPassword() {
        when(operatorUserRepository.findByEmailWithOperator("owner@expreso.pe"))
                .thenReturn(Optional.of(activeOwner()));
        when(passwordEncoder.matches("wrong", "bcrypt-hash")).thenReturn(false);

        assertThatThrownBy(() -> service.login(loginRequest("owner@expreso.pe", "wrong")))
                .isInstanceOf(BadRequestException.class);
    }
}
