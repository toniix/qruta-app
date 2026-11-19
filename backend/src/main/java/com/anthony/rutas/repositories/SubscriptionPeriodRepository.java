package com.anthony.rutas.repositories;

import com.anthony.rutas.billing.SubscriptionPeriodStatus;
import com.anthony.rutas.entities.SubscriptionPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionPeriodRepository extends JpaRepository<SubscriptionPeriod, UUID> {

    List<SubscriptionPeriod> findBySubscriptionIdOrderByFromAtDesc(UUID subscriptionId);

    Optional<SubscriptionPeriod> findFirstBySubscriptionIdAndStatusOrderByFromAtDesc(
            UUID subscriptionId, SubscriptionPeriodStatus status);

    Optional<SubscriptionPeriod> findByProviderReference(String providerReference);
}
