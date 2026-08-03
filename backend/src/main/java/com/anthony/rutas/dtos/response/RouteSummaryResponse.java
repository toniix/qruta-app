package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

/**
 * Lightweight summary of a Route for the public cards endpoint
 * ({@code GET /api/routes/cards}).
 * Contains only the fields required for the route card UI.
 */
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
    private String fare;
    private String transportLineName;
    private List<KeyStopResponse> keyStops;
}
