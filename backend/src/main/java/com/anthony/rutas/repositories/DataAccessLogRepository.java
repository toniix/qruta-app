package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.DataAccessLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DataAccessLogRepository extends JpaRepository<DataAccessLog, UUID> {
}
