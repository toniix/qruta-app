package com.anthony.rutas.dtos.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatorRouteResponse {
    private UUID id;
    private String code;
    private String name;
    private String category;
    private String color;
    private String status;
    private UUID transportLineId;
    private String transportLineName;
    private LocalDateTime updatedAt;
}
