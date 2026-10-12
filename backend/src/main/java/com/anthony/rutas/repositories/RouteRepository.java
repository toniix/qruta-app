package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RouteRepository extends JpaRepository<Route, UUID> {

    List<Route> findByNameContainingIgnoreCase(String name);

    /**
     * Global ranked search across all cities.
     *
     * <p>The caller passes an already-normalized term (diacritics stripped,
     * lowercased — see {@code RouteService.normalizeQuery}); the column side is
     * normalized in SQL with Postgres {@code unaccent()} so matching is
     * accent/case-insensitive. Results are ordered by a relevance score
     * (exact code &gt; exact name &gt; name prefix &gt; name contains &gt;
     * transport-line name &gt; stop name/reference) and then by popularity.
     * Requires the Postgres {@code unaccent} extension (see
     * {@code db/migration/V7__add_unaccent_search_support.sql}).
     */
    @Query("SELECT DISTINCT r FROM Route r " +
           "JOIN FETCH r.transportLine tl " +
           "JOIN FETCH tl.city " +
           "LEFT JOIN r.directions rd " +
           "LEFT JOIN rd.routeStops rs " +
           "LEFT JOIN rs.stop s " +
           "WHERE cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(r.code)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(tl.name)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(s.name)) as string) LIKE CONCAT('%', :query, '%') " +
           "   OR cast(function('unaccent', LOWER(s.reference)) as string) LIKE CONCAT('%', :query, '%') " +
           "ORDER BY CASE " +
           "   WHEN cast(function('unaccent', LOWER(r.code)) as string) = :query THEN 100 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) = :query THEN 90 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT(:query, '%') THEN 70 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT('%', :query, '%') THEN 50 " +
           "   WHEN cast(function('unaccent', LOWER(tl.name)) as string) LIKE CONCAT('%', :query, '%') THEN 30 " +
           "   ELSE 20 END DESC, " +
           "COALESCE(r.popularityScore, 0) DESC")
    List<Route> searchByQuery(@Param("query") String query, Pageable pageable);

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
     * City-scoped ranked search. Same normalization, scoring and ordering as
     * {@link #searchByQuery(String, Pageable)}, restricted to one city.
     */
    @Query("SELECT DISTINCT r FROM Route r " +
           "JOIN FETCH r.transportLine tl " +
           "JOIN FETCH tl.city c " +
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
           "ORDER BY CASE " +
           "   WHEN cast(function('unaccent', LOWER(r.code)) as string) = :query THEN 100 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) = :query THEN 90 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT(:query, '%') THEN 70 " +
           "   WHEN cast(function('unaccent', LOWER(r.name)) as string) LIKE CONCAT('%', :query, '%') THEN 50 " +
           "   WHEN cast(function('unaccent', LOWER(tl.name)) as string) LIKE CONCAT('%', :query, '%') THEN 30 " +
           "   ELSE 20 END DESC, " +
           "COALESCE(r.popularityScore, 0) DESC")
    List<Route> searchByQueryAndCityId(@Param("query") String query, @Param("cityId") UUID cityId,
                                      Pageable pageable);
}
