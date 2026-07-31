package com.anthony.rutas.dtos.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoutePointResponse {
    private Integer sequence;
    private Double latitude;
    private Double longitude;
}
