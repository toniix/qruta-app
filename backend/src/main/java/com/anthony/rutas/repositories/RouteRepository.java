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

    @Query("SELECT DISTINCT r FROM Route r " +
           "JOIN FETCH r.transportLine tl " +
           "LEFT JOIN r.directions rd " +
           "LEFT JOIN rd.routeStops rs " +
           "LEFT JOIN rs.stop s " +
           "WHERE LOWER(r.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "   OR LOWER(r.code) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "   OR LOWER(tl.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "   OR LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "   OR LOWER(s.reference) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Route> searchByQuery(@Param("query") String query);

    /**
     * Fetch all routes with transport line in a single query.
     */
    @Query("SELECT DISTINCT r FROM Route r JOIN FETCH r.transportLine")
    List<Route> findAllWithTransportLine();

    @Query("SELECT DISTINCT r FROM Route r JOIN FETCH r.transportLine WHERE r.id IN :ids")
    List<Route> findAllByIdWithTransportLine(@Param("ids") Collection<UUID> ids);

    @Query("SELECT DISTINCT r FROM Route r JOIN FETCH r.transportLine WHERE r.transportLine.id = :transportLineId")
    List<Route> findByTransportLineIdWithLine(@Param("transportLineId") UUID transportLineId);

    /**
     * Fetch the most popular active routes, ordered by popularity score
     * descending. Routes without a score (null) are treated as 0 and sorted last.
     */
    @Query("SELECT r FROM Route r WHERE r.status = 'ACTIVE' " +
           "ORDER BY COALESCE(r.popularityScore, 0) DESC, r.name ASC")
    List<Route> findPopular(Pageable pageable);
}
