package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.ChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChangeLogRepository extends JpaRepository<ChangeLog, UUID> {

    List<ChangeLog> findTop100ByOperatorIdOrderByCreatedAtDesc(UUID operatorId);
}
