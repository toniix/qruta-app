package com.anthony.rutas.dtos.response;

import lombok.*;

/**
 * Unified reverse-geocode label returned by {@code GET /api/geocode/reverse}.
 * The shape is provider-agnostic; {@code source} names the provider that
 * answered ({@code google} or {@code photon}).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReverseGeocodeResponse {
    private String formattedAddress;
    private String street;
    private String streetNumber;
    private String district;
    private String city;
    private String source;
}
