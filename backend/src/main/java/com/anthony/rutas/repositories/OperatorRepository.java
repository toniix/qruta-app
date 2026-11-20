package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.Operator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface OperatorRepository extends JpaRepository<Operator, UUID> {

    boolean existsByRucIgnoreCase(String ruc);

    boolean existsByRucIgnoreCaseAndIdNot(String ruc, UUID id);

    /**
     * Fetch operators with their city in a single query so list responses do not
     * trigger an N+1 on {@code city.name}.
     */
    @Query("SELECT DISTINCT o FROM Operator o LEFT JOIN FETCH o.city")
    List<Operator> findAllWithCity();
}
