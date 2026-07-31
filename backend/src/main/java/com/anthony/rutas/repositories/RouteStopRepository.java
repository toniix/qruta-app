package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RouteStopRepository extends JpaRepository<RouteStop, Long> {
    List<RouteStop> findByRouteIdOrderBySequenceAsc(Long routeId);
    List<RouteStop> findByStopId(Long stopId);
}
