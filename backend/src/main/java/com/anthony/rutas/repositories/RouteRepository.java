package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RouteRepository extends JpaRepository<Route, UUID> {

    Optional<Route> findByCodeIgnoreCase(String code);

    List<Route> findByNameContainingIgnoreCase(String name);

    /**
     * Step 1 of global ranked search: returns route IDs ordered by relevance.
     *
     * <p>WHY TWO-STEP: the previous single-query shape ({@code SELECT DISTINCT r
     * ... ORDER BY CASE ... END}) fails on Postgres with
     * {@code "for SELECT DISTINCT, ORDER BY expressions must appear in select
     * list"}, and the CASE score cannot go in the select list without changing
     * the entity result shape. Ranking IDs with {@code GROUP BY r.id} plus
     * aggregates in {@code ORDER BY} is valid Postgres (ordering by
     * {@code MAX(...)} needs no select-list entry), so this query keeps the
     * exact same match predicates, CASE tiers and tie-break order while the
     * caller hydrates entities in a second step and restores ID order in Java.
     *
     * <p>The caller passes an already-normalized term (diacritics stripped,
     * lowercased — see {@code RouteService.normalizeQuery}); the column side is
     * normalized in SQL with Postgres {@code unaccent()} so matching is
     * accent/case-insensitive. Relevance score: exact code (100) &gt; exact name
     * (90) &gt; name prefix (70) &gt; name contains (50) &gt; transport-line name
     * (30) &gt; stop name/reference (20), then popularity. Requires the Postgres
     * {@code unaccent} extension (see
     * {@code db/migration/V7__add_unaccent_search_support.sql}).
     */
    @Query("SELECT r.id FROM Route r " +
           "JOIN r.transportLine tl " +
           "LEFT JOIN r.directions rd " +
           "LEFT JOIN rd.routeStops rs " +
           "LEFT JOIN rs.stop s " +
           "WHERE cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(r.code)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(tl.name)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(s.name)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(s.reference)) as string) LIKE CONCAT('%', :query, '%') " +
           "GROUP BY r.id " +
           "ORDER BY MAX(CASE " +
           "   WHEN cast(function('unaccent', LOWER(r.code)) as string) = :query THEN 100 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) = :query THEN 90 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT(:query, '%') THEN 70 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT('%', :query, '%') THEN 50 " +
           "   WHEN cast(function('unaccent', LOWER(tl.name)) as string) LIKE CONCAT('%', :query, '%') THEN 30 " +
           "   ELSE 20 END) DESC, " +
           "MAX(COALESCE(r.popularityScore, 0)) DESC")
    List<UUID> searchRankedRouteIds(@Param("query") String query, Pageable pageable);

    /**
     * Step 2 of ranked search: hydrates entities for ranked IDs.
     *
     * <p>Fetches {@code transportLine} and its {@code city} (both read by
     * {@code DtoMapper.toRouteSummaryResponse}) in one query so hydration adds
     * no N+1. The {@code IN} clause preserves no order — the caller reorders to
     * the step-1 ID order in Java. Never call with an empty collection.
     */
    @Query("SELECT DISTINCT r FROM Route r " +
           "JOIN FETCH r.transportLine tl " +
           "JOIN FETCH tl.city " +
           "WHERE r.id IN :ids")
    List<Route> findAllByIdsWithTransportLineAndCity(@Param("ids") Collection<UUID> ids);

    /**
     * Fetch all routes with transport line in a single query.
     */
    @Query("SELECT DISTINCT r FROM Route r JOIN FETCH r.transportLine")
    List<Route> findAllWithTransportLine();

    @Query("SELECT DISTINCT r FROM Route r JOIN FETCH r.transportLine WHERE r.id IN :ids")
    List<Route> findAllByIdWithTransportLine(@Param("ids") Collection<UUID> ids);

    @Query("SELECT DISTINCT r FROM Route r JOIN FETCH r.transportLine WHERE r.transportLine.id = :transportLineId")
    List<Route> findByTransportLineIdWithLine(@Param("transportLineId") UUID transportLineId);

    @Query("SELECT DISTINCT r FROM Route r " +
           "JOIN FETCH r.transportLine tl " +
           "JOIN FETCH tl.city")
    List<Route> findAllWithTransportLineAndCity();

    @Query("SELECT DISTINCT r FROM Route r " +
           "JOIN FETCH r.transportLine tl " +
           "JOIN FETCH tl.city c " +
           "WHERE c.id = :cityId")
    List<Route> findAllByCityIdWithTransportLine(@Param("cityId") UUID cityId);

    /**
     * Fetch the most popular active routes, ordered by popularity score
     * descending. Routes without a score (null) are treated as 0 and sorted last.
     */
    @Query("SELECT r FROM Route r WHERE r.status = 'ACTIVE' " +
           "ORDER BY COALESCE(r.popularityScore, 0) DESC, r.name ASC")
    List<Route> findPopular(Pageable pageable);

    @Query("SELECT r FROM Route r " +
           "JOIN FETCH r.transportLine tl " +
           "JOIN FETCH tl.city c " +
           "WHERE r.status = 'ACTIVE' AND c.id = :cityId " +
           "ORDER BY COALESCE(r.popularityScore, 0) DESC, r.name ASC")
    List<Route> findPopularByCityId(@Param("cityId") UUID cityId, Pageable pageable);

    /**
     * Step 1 of city-scoped ranked search: same predicates, scoring and
     * ordering as {@link #searchRankedRouteIds(String, Pageable)}, restricted
     * to one city. Two-step for the same Postgres DISTINCT + ORDER BY reason
     * documented there.
     */
    @Query("SELECT r.id FROM Route r " +
           "JOIN r.transportLine tl " +
           "JOIN tl.city c " +
           "LEFT JOIN r.directions rd " +
           "LEFT JOIN rd.routeStops rs " +
           "LEFT JOIN rs.stop s " +
           "WHERE c.id = :cityId AND (" +
           "   cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(r.code)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(tl.name)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(s.name)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(s.reference)) as string) LIKE CONCAT('%', :query, '%')" +
           ") " +
           "GROUP BY r.id " +
           "ORDER BY MAX(CASE " +
           "   WHEN cast(function('unaccent', LOWER(r.code)) as string) = :query THEN 100 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) = :query THEN 90 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT(:query, '%') THEN 70 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT('%', :query, '%') THEN 50 " +
           "   WHEN cast(function('unaccent', LOWER(tl.name)) as string) LIKE CONCAT('%', :query, '%') THEN 30 " +
           "   ELSE 20 END) DESC, " +
           "MAX(COALESCE(r.popularityScore, 0)) DESC")
    List<UUID> searchRankedRouteIdsByCityId(@Param("query") String query, @Param("cityId") UUID cityId,
                                           Pageable pageable);
}
