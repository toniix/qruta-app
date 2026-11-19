package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.BillingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BillingEventRepository extends JpaRepository<BillingEvent, UUID> {

    boolean existsByProviderEventId(String providerEventId);
}
