package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.QrCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QrCodeRepository extends JpaRepository<QrCode, UUID> {

    Optional<QrCode> findByCode(String code);

    List<QrCode> findByOperatorIdOrderByCreatedAtDesc(UUID operatorId);

    List<QrCode> findAllByOrderByCreatedAtDesc();

    boolean existsByCode(String code);

    long countByTargetTypeAndTargetIdAndStatusIn(String targetType, UUID targetId, List<String> statuses);
}
