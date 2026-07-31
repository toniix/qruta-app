package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.TransportLine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransportLineRepository extends JpaRepository<TransportLine, Long> {
    List<TransportLine> findByCityId(Long cityId);
    List<TransportLine> findByNameContainingIgnoreCase(String name);
}
