package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.ChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ChangeLogRepository extends JpaRepository<ChangeLog, UUID> {

    @Query("SELECT c FROM ChangeLog c WHERE c.operatorId = :operatorId ORDER BY c.createdAt DESC")
    List<ChangeLog> findByOperatorId(@Param("operatorId") UUID operatorId);

    List<ChangeLog> findTop100ByOperatorIdOrderByCreatedAtDesc(UUID operatorId);
}
