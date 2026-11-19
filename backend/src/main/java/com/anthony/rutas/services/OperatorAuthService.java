package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.LoginRequest;
import com.anthony.rutas.dtos.response.OperatorAuthResponse;
import com.anthony.rutas.entities.OperatorUser;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.repositories.OperatorUserRepository;
import com.anthony.rutas.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OperatorAuthService {

    private final OperatorUserRepository operatorUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional(readOnly = true)
    public OperatorAuthResponse login(LoginRequest request) {
        OperatorUser user = operatorUserRepository.findByEmailWithOperator(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid operator credentials"));

        if (!user.isActive() || !user.getOperator().isActive()) {
            throw new BadRequestException("Operator account is inactive");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid operator credentials");
        }

        UUID operatorId = user.getOperator().getId();
        String token = jwtUtil.generateToken(user.getEmail(), "ROLE_OPERATOR", operatorId);

        return OperatorAuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .operatorId(operatorId)
                .operatorName(user.getOperator().getName())
                .build();
    }
}
