package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RouteStopRepository extends JpaRepository<RouteStop, UUID> {
    List<RouteStop> findByDirectionIdOrderByStopOrderAsc(UUID directionId);
    List<RouteStop> findByStopId(UUID stopId);
}
