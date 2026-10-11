package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RouteStopRepository extends JpaRepository<RouteStop, UUID> {
    List<RouteStop> findByDirectionIdOrderByStopOrderAsc(UUID directionId);

    /**
     * Route stops for one stop, with direction and route already fetched, so
     * dereferencing them costs no extra queries.
     */
    @Query("SELECT rs FROM RouteStop rs " +
           "JOIN FETCH rs.direction rd " +
           "JOIN FETCH rd.route r " +
           "WHERE rs.stop.id = :stopId")
    List<RouteStop> findWithDirectionAndRouteByStopId(@Param("stopId") UUID stopId);

    /**
     * Distinct route ids served by any of the given stops, in a single query.
     * Replaces a {@code findByStopId} call per stop (N+1) in the nearby-routes flow.
     */
    @Query("SELECT DISTINCT rd.route.id FROM RouteStop rs " +
           "JOIN rs.direction rd " +
           "WHERE rs.stop.id IN :stopIds")
    List<UUID> findRouteIdsByStopIds(@Param("stopIds") Collection<UUID> stopIds);

    /**
     * Batch fetch all key stops for a given list of route IDs in a single query with eager fetch.
     * Prevents N+1 queries when building RouteSummary cards.
     */
    @Query("SELECT rs FROM RouteStop rs " +
           "JOIN FETCH rs.stop s " +
           "JOIN FETCH rs.direction rd " +
           "JOIN FETCH rd.route r " +
           "WHERE r.id IN :routeIds " +
           "AND s.keyStop = true")
    List<RouteStop> findKeyStopsByRouteIds(@Param("routeIds") Collection<UUID> routeIds);

    /**
     * Batch count distinct stops per route for a list of routes in a single query.
     * Returns Object[] with [UUID routeId, Long distinctStopCount]
     */
    @Query("SELECT rd.route.id, COUNT(DISTINCT rs.stop.id) " +
           "FROM RouteStop rs " +
           "JOIN rs.direction rd " +
           "WHERE rd.route.id IN :routeIds " +
           "GROUP BY rd.route.id")
    List<Object[]> countDistinctStopsByRouteIds(@Param("routeIds") Collection<UUID> routeIds);
}
