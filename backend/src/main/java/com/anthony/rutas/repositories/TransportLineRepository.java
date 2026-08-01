package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.TransportLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransportLineRepository extends JpaRepository<TransportLine, UUID> {
    List<TransportLine> findByCityId(UUID cityId);
    List<TransportLine> findByNameContainingIgnoreCase(String name);
}
