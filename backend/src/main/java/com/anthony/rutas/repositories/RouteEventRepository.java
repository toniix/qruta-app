package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RouteEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RouteEventRepository extends JpaRepository<RouteEvent, UUID> {

    @Query("""
            SELECT e.campaign AS campaign, COUNT(e) AS scans
            FROM RouteEvent e
            WHERE e.category = :category
              AND e.recordedAt >= :from
              AND e.recordedAt < :to
              AND e.transportLineId IN :lineIds
            GROUP BY e.campaign
            ORDER BY COUNT(e) DESC
            """)
    List<QrCampaignRow> countQrScansByCampaign(
            @Param("category") String category,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("lineIds") Collection<UUID> lineIds);

    interface QrCampaignRow {
        String getCampaign();

        Long getScans();
    }
}
