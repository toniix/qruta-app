package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StopResponse {
    private UUID id;
    private String name;
    private Double latitude;
    private Double longitude;
    private String reference;
    private String address;
    private boolean isAccessible;
    private UUID cityId;
    private String cityName;
    private String imageUrl;
}
