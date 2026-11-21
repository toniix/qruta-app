package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RouteEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RouteEventRepository extends JpaRepository<RouteEvent, UUID> {

    long countByQrCodeIdAndCategory(UUID qrCodeId, String category);

    long countByQrCodeIdAndCategoryIn(UUID qrCodeId, Collection<String> categories);

    List<RouteEvent> findByQrCodeIdAndCategoryOrderByRecordedAtAsc(UUID qrCodeId, String category);

    @Query("""
            SELECT e.qrCodeId AS qrCodeId, COUNT(e) AS scanCount
            FROM RouteEvent e
            WHERE e.category = 'qr_scan' AND e.qrCodeId IS NOT NULL
            GROUP BY e.qrCodeId
            """)
    List<QrScanCountRow> countAllScansByQrCodeId();

    interface QrScanCountRow {
        UUID getQrCodeId();
        Long getScanCount();
    }
}
