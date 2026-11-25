package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.TransportLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransportLineRepository extends JpaRepository<TransportLine, UUID> {
    /**
     * Fetch all transport lines with their city and optional operator in a single
     * query, avoiding the N+1 that {@code TransportLineResponse}'s {@code cityId}
     * / {@code operatorId} would otherwise cause.
     */
    @Query("SELECT DISTINCT l FROM TransportLine l JOIN FETCH l.city LEFT JOIN FETCH l.operator")
    List<TransportLine> findAllWithCity();

    @Query("SELECT DISTINCT l FROM TransportLine l JOIN FETCH l.city LEFT JOIN FETCH l.operator WHERE l.city.id = :cityId")
    List<TransportLine> findByCityIdWithCity(@Param("cityId") UUID cityId);

    @Query("SELECT DISTINCT l FROM TransportLine l JOIN FETCH l.city WHERE l.operator.id = :operatorId")
    List<TransportLine> findByOperatorId(@Param("operatorId") UUID operatorId);

    @Query("SELECT l FROM TransportLine l WHERE l.id = :id AND l.operator.id = :operatorId")
    Optional<TransportLine> findByIdAndOperatorId(@Param("id") UUID id, @Param("operatorId") UUID operatorId);
}
