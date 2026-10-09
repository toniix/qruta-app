package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

/**
 * Represents a Route (grouped by route, not by direction) that passes through
 * a given Stop ({@code GET /api/stops/{id}/routes}).
 * <p>
 * {@code directionLabel} is derived from {@code directions} at mapping time and
 * is never persisted. Values: "IDA", "VUELTA" or "IDA Y VUELTA".
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StopRouteResponse {
    private UUID id;
    private String code;
    private String name;
    private String color;
    private List<String> directions;
    private String directionLabel;
}