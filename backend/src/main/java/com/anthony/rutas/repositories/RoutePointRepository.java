package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RoutePoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoutePointRepository extends JpaRepository<RoutePoint, UUID> {
    List<RoutePoint> findByDirectionIdOrderByPointOrderAsc(UUID directionId);
}
