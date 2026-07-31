package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RoutePoint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoutePointRepository extends JpaRepository<RoutePoint, Long> {
    List<RoutePoint> findByRouteIdOrderBySequenceAsc(Long routeId);
}
