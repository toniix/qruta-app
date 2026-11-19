package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.Operator;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OperatorRepository extends JpaRepository<Operator, UUID> {
}
