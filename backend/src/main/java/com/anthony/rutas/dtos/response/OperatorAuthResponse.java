package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatorAuthResponse {
    private String token;
    private String email;
    private String fullName;
    private String role;
    private UUID operatorId;
    private String operatorName;
}
