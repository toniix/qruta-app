package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatorLineResponse {
    private UUID id;
    private String company;
    private String color;
    private String contact;
    private String description;
    private String status;
    private long routeCount;
}
