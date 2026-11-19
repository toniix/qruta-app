package com.anthony.rutas.repositories;

import com.anthony.rutas.billing.SubscriptionStatus;
import com.anthony.rutas.entities.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    Optional<Subscription> findByOperatorId(UUID operatorId);

    List<Subscription> findAllByStatus(SubscriptionStatus status);
}
