package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.DataApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface DataApiKeyRepository extends JpaRepository<DataApiKey, UUID> {

    Optional<DataApiKey> findByKeyHash(String keyHash);

    /**
     * Atomically rolls over the billing period when needed and increments
     * {@code usedThisPeriod} only if the key is still under {@code monthlyQuota}.
     * Returns 1 when quota was consumed, or 0 when the quota is exhausted.
     */
    @Modifying
    @Query("""
            UPDATE DataApiKey k
            SET k.usedThisPeriod = CASE
                    WHEN k.periodStart IS NULL OR k.periodStart < :currentPeriod THEN 1
                    ELSE k.usedThisPeriod + 1
                END,
                k.periodStart = CASE
                    WHEN k.periodStart IS NULL OR k.periodStart < :currentPeriod THEN :currentPeriod
                    ELSE k.periodStart
                END,
                k.lastUsedAt = :now
            WHERE k.id = :id
              AND (k.periodStart IS NULL OR k.periodStart < :currentPeriod OR k.usedThisPeriod < k.monthlyQuota)
            """)
    int consumeQuotaAtomically(
            @Param("id") UUID id,
            @Param("currentPeriod") LocalDate currentPeriod,
            @Param("now") LocalDateTime now);
}
