package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RouteDirection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RouteDirectionRepository extends JpaRepository<RouteDirection, UUID> {
    List<RouteDirection> findByRouteId(UUID routeId);
}
