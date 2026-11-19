package com.anthony.rutas.dtos.response;

import java.time.Instant;

public record DataCoverageResponse(
        String citySlug,
        String cityName,
        int routeCount,
        int stopCount,
        SpatialCoverage spatialCoverage,
        DataLicenseInfo license,
        Instant generatedAt) {

    public record SpatialCoverage(
            int zoneCount,
            double areaSqKm,
            double latitude,
            double longitude,
            double radiusKm) {
    }
}
