package com.anthony.rutas.dtos.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransportLineResponse {
    private Long id;
    private String name;
    private String number;
    private String color;
    private Long cityId;
}
