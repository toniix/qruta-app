package com.anthony.rutas.services;

import com.anthony.rutas.utils.HashUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

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
        return HashUtils.sha256Hex(dailySalt(day) + "|" + (deviceId == null ? "" : deviceId));
    }

    /** Salt for a given UTC day; exposed for tests and for same-day consistency checks. */
    public String dailySalt(LocalDate day) {
        return HashUtils.sha256Hex(baseSalt + "|" + day);
    }
}
