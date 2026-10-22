package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.UUID;

/**
 * Projection of a Stop marked as a key stop (keyStop = true).
 * Included in {@link RouteSummaryResponse} to give cards a quick preview
 * of the most relevant stops without loading full route directions.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KeyStopResponse {
    private UUID id;
    private String name;
    private Double latitude;
    private Double longitude;

    /**
     * Full public URL of the stop's reference image (null when the stop has
     * none). Carried here so route-list stop markers can populate the citizen
     * StopDetailDrawer identically to nearby stops.
     */
    private String imageUrl;
}
