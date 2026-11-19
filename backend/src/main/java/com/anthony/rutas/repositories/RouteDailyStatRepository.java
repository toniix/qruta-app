package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RouteDailyStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RouteDailyStatRepository extends JpaRepository<RouteDailyStat, UUID> {

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM RouteDailyStat s WHERE s.date = :date AND s.cityId = :cityId")
    int deleteByCityIdAndDate(@Param("cityId") UUID cityId, @Param("date") LocalDate date);

    List<RouteDailyStat> findByDateBetweenOrderByDateAsc(LocalDate from, LocalDate to);

    List<RouteDailyStat> findByCityIdAndDateBetweenOrderByDateAsc(UUID cityId, LocalDate from, LocalDate to);

    List<RouteDailyStat> findByRouteIdAndDateBetweenOrderByDateAsc(UUID routeId, LocalDate from, LocalDate to);

    List<RouteDailyStat> findByTransportLineIdInAndDateBetweenOrderByDateAsc(
            Collection<UUID> transportLineIds, LocalDate from, LocalDate to);

    /**
     * Aggregates one UTC day of raw events into per-route (and per-city rollup) rows.
     * Rows whose city cannot be resolved are dropped so the non-null city column holds.
     */
    @Query(value = """
            SELECT e.route_id AS routeId,
                   e.transport_line_id AS transportLineId,
                   COALESCE(e.city_id, tl.city_id, rtl.city_id) AS cityId,
                   CAST(e.recorded_at AS date) AS statDate,
                   COALESCE(SUM(CASE WHEN e.category = 'route_view' THEN 1 ELSE 0 END), 0) AS views,
                   COALESCE(SUM(CASE WHEN e.category = 'route_search' THEN 1 ELSE 0 END), 0) AS searches,
                   COALESCE(SUM(CASE WHEN e.category = 'qr_scan' THEN 1 ELSE 0 END), 0) AS qrScans,
                   COALESCE(SUM(CASE WHEN e.category = 'stop_view' THEN 1 ELSE 0 END), 0) AS stopViews,
                   COALESCE(SUM(CASE WHEN e.category = 'nearby_query' THEN 1 ELSE 0 END), 0) AS nearbyQueries,
                   COALESCE(SUM(CASE WHEN e.category = 'community_post' THEN 1 ELSE 0 END), 0) AS communityPosts,
                   COUNT(DISTINCT e.device_hash) AS uniqueDevices
            FROM route_events e
            LEFT JOIN routes r ON e.route_id = r.id
            LEFT JOIN transport_lines rtl ON r.transport_line_id = rtl.id
            LEFT JOIN transport_lines tl ON e.transport_line_id = tl.id
            WHERE e.recorded_at >= :start AND e.recorded_at < :end
            GROUP BY e.route_id, e.transport_line_id, COALESCE(e.city_id, tl.city_id, rtl.city_id), CAST(e.recorded_at AS date)
            HAVING COALESCE(e.city_id, tl.city_id, rtl.city_id) IS NOT NULL
            """, nativeQuery = true)
    List<DailyStatRow> aggregateDay(@Param("start") Instant start, @Param("end") Instant end);

    /** Projection of one aggregated row; see {@link #aggregateDay(Instant, Instant)}. */
    interface DailyStatRow {
        UUID getRouteId();
        UUID getTransportLineId();
        UUID getCityId();
        LocalDate getStatDate();
        Long getViews();
        Long getSearches();
        Long getQrScans();
        Long getStopViews();
        Long getNearbyQueries();
        Long getCommunityPosts();
        Long getUniqueDevices();
    }
}
