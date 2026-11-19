package com.anthony.rutas.dtos.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateOperatorRouteRequest {
    private String name;
    private String code;
    private String category;
    private String color;
    private String description;
    private String status;
}
