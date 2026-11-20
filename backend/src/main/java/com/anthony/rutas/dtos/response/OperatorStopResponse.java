package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatorStopResponse {
    private UUID id;
    private String name;
    private String slug;
    private String address;
    private String reference;
    private Boolean keyStop;
    private boolean accessible;
    private Double latitude;
    private Double longitude;
}
