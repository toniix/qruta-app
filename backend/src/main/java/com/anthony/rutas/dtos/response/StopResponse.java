package com.anthony.rutas.dtos.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StopResponse {
    private Long id;
    private String name;
    private Double latitude;
    private Double longitude;
}
