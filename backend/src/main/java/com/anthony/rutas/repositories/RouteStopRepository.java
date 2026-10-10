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
    List<RouteStop> findByStopId(UUID stopId);

    /**
     * Batch fetch all key stops for a given list of route IDs in a single query with eager Stop fetch.
     * Prevents N+1 queries when building RouteSummary cards.
     */
    @Query("SELECT rs FROM RouteStop rs " +
           "JOIN FETCH rs.stop s " +
           "JOIN rs.direction rd " +
           "WHERE rd.route.id IN :routeIds " +
           "AND s.keyStop = true")
    List<RouteStop> findKeyStopsByRouteIds(@Param("routeIds") Collection<UUID> routeIds);
}
