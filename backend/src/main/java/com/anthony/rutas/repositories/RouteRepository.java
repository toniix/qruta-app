package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface RouteRepository extends JpaRepository<Route, Long> {
    List<Route> findByTransportLineId(Long transportLineId);
    List<Route> findByNameContainingIgnoreCase(String name);

    @Query("SELECT r FROM Route r WHERE LOWER(r.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(r.transportLine.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Route> searchByQuery(@Param("query") String query);
}
