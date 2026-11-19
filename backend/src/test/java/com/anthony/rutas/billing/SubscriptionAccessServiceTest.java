package com.anthony.rutas.billing;

import com.anthony.rutas.entities.Subscription;
import com.anthony.rutas.repositories.SubscriptionRepository;
import com.anthony.rutas.security.OperatorScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionAccessServiceTest {

    private static final UUID OPERATOR_ID = UUID.randomUUID();

    @Mock
    private OperatorScope operatorScope;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    private SubscriptionAccessService service;

    @BeforeEach
    void setUp() {
        service = new SubscriptionAccessService(operatorScope, subscriptionRepository);
        when(operatorScope.requireOperatorId()).thenReturn(OPERATOR_ID);
    }

    @Test
    void writeAccessAllowsTrialAndActive() {
        stubStatus(SubscriptionStatus.TRIAL);
        assertThatCode(service::requireWriteAccess).doesNotThrowAnyException();

        stubStatus(SubscriptionStatus.ACTIVE);
        assertThatCode(service::requireWriteAccess).doesNotThrowAnyException();
    }

    @Test
    void writeAccessRejectsBlockedStatuses() {
        for (SubscriptionStatus status : new SubscriptionStatus[]{
                SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED}) {
            stubStatus(status);
            assertThrows(AccessDeniedException.class, service::requireWriteAccess);
        }
    }

    @Test
    void analyticsAllowsTrialActiveAndPastDue() {
        for (SubscriptionStatus status : new SubscriptionStatus[]{
                SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE}) {
            stubStatus(status);
            assertThatCode(service::requireAnalyticsAccess).doesNotThrowAnyException();
        }
    }

    @Test
    void analyticsRejectsCanceledAndExpired() {
        for (SubscriptionStatus status : new SubscriptionStatus[]{
                SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED}) {
            stubStatus(status);
            assertThrows(AccessDeniedException.class, service::requireAnalyticsAccess);
        }
    }

    @Test
    void missingSubscriptionDefaultsToActive() {
        when(subscriptionRepository.findByOperatorId(OPERATOR_ID)).thenReturn(Optional.empty());

        assertThatCode(service::requireWriteAccess).doesNotThrowAnyException();
        assertThatCode(service::requireAnalyticsAccess).doesNotThrowAnyException();
    }

    private void stubStatus(SubscriptionStatus status) {
        when(subscriptionRepository.findByOperatorId(OPERATOR_ID)).thenReturn(Optional.of(
                Subscription.builder().status(status).build()));
    }
}
