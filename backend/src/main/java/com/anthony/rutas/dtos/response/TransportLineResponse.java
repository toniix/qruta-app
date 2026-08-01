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
    private String description;
    private String status;
}
