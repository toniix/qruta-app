package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatorProfileResponse {
    private UUID operatorId;
    private String operatorName;
    private String plan;
    private String cityName;
    private String email;
    private String fullName;
    private String role;
}
