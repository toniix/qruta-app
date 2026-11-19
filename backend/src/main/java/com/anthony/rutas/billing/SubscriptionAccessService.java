package com.anthony.rutas.billing;

import com.anthony.rutas.entities.Subscription;
import com.anthony.rutas.repositories.SubscriptionRepository;
import com.anthony.rutas.security.OperatorScope;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.function.Predicate;

@Service
@RequiredArgsConstructor
public class SubscriptionAccessService {

    private final OperatorScope operatorScope;
    private final SubscriptionRepository subscriptionRepository;

    public void requireWriteAccess() {
        require(status -> status == SubscriptionStatus.TRIAL || status == SubscriptionStatus.ACTIVE,
                "Subscription does not allow catalog changes");
    }

    public void requireAnalyticsAccess() {
        require(status -> status != SubscriptionStatus.CANCELED && status != SubscriptionStatus.EXPIRED,
                "Subscription does not allow analytics access");
    }

    private void require(Predicate<SubscriptionStatus> allowed, String message) {
        SubscriptionStatus status = subscriptionRepository.findByOperatorId(operatorScope.requireOperatorId())
                .map(Subscription::getStatus)
                .orElse(SubscriptionStatus.ACTIVE);
        if (!allowed.test(status)) {
            throw new AccessDeniedException(message);
        }
    }
}
