package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RouteRepository extends JpaRepository<Route, UUID> {

    List<Route> findByTransportLineId(UUID transportLineId);

    List<Route> findByNameContainingIgnoreCase(String name);

    @Query("SELECT r FROM Route r WHERE LOWER(r.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(r.code) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(r.transportLine.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Route> searchByQuery(@Param("query") String query);
}
