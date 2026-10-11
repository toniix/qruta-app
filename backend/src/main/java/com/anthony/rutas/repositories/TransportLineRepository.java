package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.TransportLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TransportLineRepository extends JpaRepository<TransportLine, UUID> {
    List<TransportLine> findByNameContainingIgnoreCase(String name);

    /**
     * Fetch all transport lines with their city in a single query, avoiding the
     * N+1 that {@code TransportLineResponse}'s {@code cityId} would otherwise cause.
     */
    @Query("SELECT DISTINCT l FROM TransportLine l JOIN FETCH l.city")
    List<TransportLine> findAllWithCity();

    @Query("SELECT DISTINCT l FROM TransportLine l JOIN FETCH l.city WHERE l.city.id = :cityId")
    List<TransportLine> findByCityIdWithCity(@Param("cityId") UUID cityId);
}
