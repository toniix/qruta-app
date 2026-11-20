package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransportLineResponse {
    private UUID id;
    private UUID cityId;
    private String company;
    private String color;
    private String contact;
    private String description;
    private String status;
    private UUID operatorId;
    private String operatorName;
}
