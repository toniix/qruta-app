package com.anthony.rutas.billing;

import com.anthony.rutas.dtos.response.BillingMonthlyCloseResponse;
import com.anthony.rutas.entities.Subscription;
import com.anthony.rutas.entities.SubscriptionPeriod;
import com.anthony.rutas.repositories.SubscriptionPeriodRepository;
import com.anthony.rutas.repositories.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingMonthlyCloseService {

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPeriodRepository subscriptionPeriodRepository;
    private final SubscriptionCatalogService catalogService;
    private final SubscriptionStateMachine stateMachine;

    @Transactional
    public BillingMonthlyCloseResponse run() {
        LocalDateTime now = LocalDateTime.now();
        int charged = 0;
        int markedPastDue = 0;
        int expired = 0;

        List<Subscription> active = subscriptionRepository.findAllByStatus(SubscriptionStatus.ACTIVE);
        for (Subscription subscription : active) {
            if (subscription.getRenewsAt() == null || subscription.getRenewsAt().isAfter(now)) {
                continue;
            }
            subscription.setStatus(stateMachine.transition(
                    subscription.getStatus(), SubscriptionStatus.PAST_DUE));
            subscription.setGraceUntil(now.plusDays(5));
            subscription.setRenewsAt(now.plusDays(30));
            subscriptionPeriodRepository.save(period(subscription, now));
            markedPastDue++;
            charged++;
        }

        List<Subscription> pastDue = subscriptionRepository.findAllByStatus(SubscriptionStatus.PAST_DUE);
        for (Subscription subscription : pastDue) {
            if (subscription.getGraceUntil() == null || subscription.getGraceUntil().isAfter(now)) {
                continue;
            }
            subscription.setStatus(stateMachine.transition(
                    subscription.getStatus(), SubscriptionStatus.EXPIRED));
            subscription.setGraceUntil(null);
            expired++;
        }

        return new BillingMonthlyCloseResponse(charged, markedPastDue, expired);
    }

    private SubscriptionPeriod period(Subscription subscription, LocalDateTime now) {
        return SubscriptionPeriod.builder()
                .subscriptionId(subscription.getId())
                .operatorId(subscription.getOperatorId())
                .fromAt(now)
                .toAt(now.plusDays(30))
                .amount(catalogService.amount(subscription.getPlan()))
                .currency(catalogService.currency(subscription.getPlan()))
                .method("QR")
                .status(SubscriptionPeriodStatus.PENDING)
                .providerReference(UUID.randomUUID().toString())
                .build();
    }
}
