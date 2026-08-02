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
    private String name;
    private String code;
    private String color;
    private String company;
    private String contact;
    private String description;
    private String status;
}
