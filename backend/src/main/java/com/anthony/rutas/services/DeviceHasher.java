package com.anthony.rutas.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.LocalDate;
import java.util.HexFormat;

/**
 * Pseudonymizes a device id with SHA-256 and a salt that rotates every day.
 *
 * <p>The same device therefore deduplicates within one day but cannot be followed across
 * days, which is the privacy criterion already used by the community module. The raw
 * device id never reaches storage.
 *
 * <p>The daily salt is derived from a configured base secret plus the UTC date. It must
 * be stable across restarts and instances, otherwise deduplication would silently break;
 * when {@code app.analytics.daily-salt} is unset it falls back to the JWT secret so a
 * single configured secret still yields correct behavior.
 */
@Component
public class DeviceHasher {

    private final String baseSalt;

    public DeviceHasher(@Value("${app.analytics.daily-salt:}") String configuredSalt,
                        @Value("${app.jwt.secret:}") String jwtSecret) {
        String salt = configuredSalt == null ? "" : configuredSalt.trim();
        if (salt.isEmpty()) {
            salt = jwtSecret == null ? "" : jwtSecret.trim();
        }
        this.baseSalt = salt;
    }

    /** Stable digest for a device within the UTC day of {@code recordedAt}. */
    public String hash(String deviceId, Instant recordedAt) {
        LocalDate day = recordedAt == null
                ? LocalDate.now(ZoneOffset.UTC)
                : recordedAt.atOffset(ZoneOffset.UTC).toLocalDate();
        return sha256(dailySalt(day) + "|" + (deviceId == null ? "" : deviceId));
    }

    /** Salt for a given UTC day; exposed for tests and for same-day consistency checks. */
    public String dailySalt(LocalDate day) {
        return sha256(baseSalt + "|" + day);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}
