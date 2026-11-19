package com.anthony.rutas.dtos.response;

import java.time.LocalDate;

public record DataLicenseInfo(
        String plan,
        LocalDate validUntil,
        long remainingDays,
        int monthlyQuota,
        int remainingQuota) {
}
