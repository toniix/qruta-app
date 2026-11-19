package com.anthony.rutas.dtos.response;

import java.time.Instant;
import java.util.List;

public record OdMatrixResponse(
        String citySlug,
        Instant generatedAt,
        DataLicenseInfo license,
        List<OdPair> pairs) {

    public record OdPair(String originZone, String destinationZone, int weight) {
    }
}
