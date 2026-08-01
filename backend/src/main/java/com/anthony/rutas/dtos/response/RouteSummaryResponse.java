package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteSummaryResponse {
    private UUID id;
    private String code;
    private String name;
    private String color;
    private String description;
    private String status;
    private UUID transportLineId;
    private String transportLineName;
}
