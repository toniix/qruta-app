package com.anthony.rutas.services;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class DeviceHasherTest {

    private static final Instant DAY_1 = LocalDate.of(2026, 11, 14).atStartOfDay(ZoneOffset.UTC).toInstant();
    private static final Instant DAY_2 = LocalDate.of(2026, 11, 15).atStartOfDay(ZoneOffset.UTC).toInstant();

    private final DeviceHasher hasher = new DeviceHasher("base-salt", "jwt-secret");

    @Test
    void sameDeviceSameDayProducesTheSameHash() {
        String first = hasher.hash("device-abc", DAY_1);
        String second = hasher.hash("device-abc", DAY_1.plusSeconds(3600));

        assertThat(first).isEqualTo(second).hasSize(64);
    }

    @Test
    void sameDeviceOnTheNextDayProducesADifferentHash() {
        assertThat(hasher.hash("device-abc", DAY_1))
                .isNotEqualTo(hasher.hash("device-abc", DAY_2));
    }

    @Test
    void differentDevicesProduceDifferentHashes() {
        assertThat(hasher.hash("device-abc", DAY_1))
                .isNotEqualTo(hasher.hash("device-xyz", DAY_1));
    }

    @Test
    void fallsBackToJwtSecretWhenNoSaltIsConfigured() {
        DeviceHasher fallback = new DeviceHasher("", "jwt-secret");
        DeviceHasher explicit = new DeviceHasher("jwt-secret", "other");

        assertThat(fallback.dailySalt(LocalDate.of(2026, 11, 14)))
                .isEqualTo(explicit.dailySalt(LocalDate.of(2026, 11, 14)));
    }
}
