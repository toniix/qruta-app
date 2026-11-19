package com.anthony.rutas.billing;

import com.anthony.rutas.dtos.response.BillingMonthlyCloseResponse;
import com.anthony.rutas.entities.Subscription;
import com.anthony.rutas.entities.SubscriptionPeriod;
import com.anthony.rutas.repositories.SubscriptionPeriodRepository;
import com.anthony.rutas.repositories.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingMonthlyCloseServiceTest {

    private static final UUID SUBSCRIPTION_ID = UUID.randomUUID();
    private static final UUID OPERATOR_ID = UUID.randomUUID();

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private SubscriptionPeriodRepository subscriptionPeriodRepository;

    private BillingMonthlyCloseService service;

    @BeforeEach
    void setUp() {
        service = new BillingMonthlyCloseService(
                subscriptionRepository,
                subscriptionPeriodRepository,
                new SubscriptionCatalogService(),
                new SubscriptionStateMachine());
    }

    @Test
    void chargesDueActiveSubscriptions() {
        LocalDateTime now = LocalDateTime.now();
        Subscription due = subscription(SubscriptionStatus.ACTIVE, now.minusDays(1), null);
        Subscription future = subscription(UUID.randomUUID(), SubscriptionStatus.ACTIVE, now.plusDays(1), null);
        when(subscriptionRepository.findAllByStatus(SubscriptionStatus.ACTIVE)).thenReturn(List.of(due, future));
        when(subscriptionRepository.findAllByStatus(SubscriptionStatus.PAST_DUE)).thenReturn(List.of());

        BillingMonthlyCloseResponse response = service.run();

        assertThat(response.getCharged()).isEqualTo(1);
        assertThat(response.getMarkedPastDue()).isEqualTo(1);
        assertThat(response.getExpired()).isZero();
        assertThat(due.getStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
        assertThat(due.getGraceUntil()).isNotNull();
        assertThat(due.getRenewsAt()).isAfter(now);
        assertThat(future.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);

        ArgumentCaptor<SubscriptionPeriod> captor = ArgumentCaptor.forClass(SubscriptionPeriod.class);
        verify(subscriptionPeriodRepository).save(captor.capture());
        assertThat(captor.getValue().getSubscriptionId()).isEqualTo(SUBSCRIPTION_ID);
        assertThat(captor.getValue().getStatus()).isEqualTo(SubscriptionPeriodStatus.PENDING);
        assertThat(captor.getValue().getAmount()).isEqualByComparingTo("49.00");
        assertThat(captor.getValue().getCurrency()).isEqualTo("PEN");
        assertThat(captor.getValue().getMethod()).isEqualTo("QR");
    }

    @Test
    void expiresPastDueSubscriptionsAfterGracePeriod() {
        LocalDateTime now = LocalDateTime.now();
        Subscription expired = subscription(SubscriptionStatus.PAST_DUE, null, now.minusHours(1));
        Subscription inGrace = subscription(UUID.randomUUID(), SubscriptionStatus.PAST_DUE,
                null, now.plusHours(1));
        when(subscriptionRepository.findAllByStatus(SubscriptionStatus.ACTIVE)).thenReturn(List.of());
        when(subscriptionRepository.findAllByStatus(SubscriptionStatus.PAST_DUE))
                .thenReturn(List.of(expired, inGrace));

        BillingMonthlyCloseResponse response = service.run();

        assertThat(response.getExpired()).isEqualTo(1);
        assertThat(expired.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
        assertThat(expired.getGraceUntil()).isNull();
        assertThat(inGrace.getStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
        verify(subscriptionPeriodRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private Subscription subscription(SubscriptionStatus status, LocalDateTime renewsAt, LocalDateTime graceUntil) {
        return subscription(SUBSCRIPTION_ID, status, renewsAt, graceUntil);
    }

    private Subscription subscription(UUID id, SubscriptionStatus status,
                                      LocalDateTime renewsAt, LocalDateTime graceUntil) {
        return Subscription.builder()
                .id(id)
                .operatorId(OPERATOR_ID)
                .plan("PRO")
                .status(status)
                .startsAt(LocalDateTime.now().minusDays(30))
                .renewsAt(renewsAt)
                .graceUntil(graceUntil)
                .build();
    }
}
