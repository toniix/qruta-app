package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

/**
 * Flat summary of a Route for the admin panel ({@code GET /api/admin/routes}).
 * Carries every scalar field the admin table and the edit form need, including
 * the ones the public {@link RouteSummaryResponse} omits ({@code schedule},
 * {@code frequency}, {@code description}, {@code status}) plus the transport
 * line id so the edit form can pre-select the line.
 * <p>
 * Deliberately excludes {@code keyStops}: the admin UI never renders them, and
 * loading them would reintroduce the N+1 queries this DTO exists to avoid.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminRouteSummaryResponse {
    private UUID id;
    private String code;
    private String name;
    private String color;
    private String fare;
    private String schedule;
    private String frequency;
    private String description;
    private String status;
    private UUID transportLineId;
    private String transportLineName;
}
