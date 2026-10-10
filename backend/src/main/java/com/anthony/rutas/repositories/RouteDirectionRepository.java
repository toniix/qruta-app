package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RouteDirection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RouteDirectionRepository extends JpaRepository<RouteDirection, UUID> {
    @Query("SELECT DISTINCT rd FROM RouteDirection rd " +
           "LEFT JOIN FETCH rd.routeStops rs " +
           "LEFT JOIN FETCH rs.stop s " +
           "WHERE rd.route.id = :routeId")
    List<RouteDirection> findByRouteIdWithStops(@Param("routeId") UUID routeId);

    List<RouteDirection> findByRouteId(UUID routeId);
}

