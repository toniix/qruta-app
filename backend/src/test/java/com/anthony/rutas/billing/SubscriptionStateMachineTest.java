package com.anthony.rutas.billing;

import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SubscriptionStateMachineTest {

    private final SubscriptionStateMachine stateMachine = new SubscriptionStateMachine();

    @Test
    void keepsSameStatus() {
        for (SubscriptionStatus status : SubscriptionStatus.values()) {
            assertEquals(status, stateMachine.transition(status, status));
        }
    }

    @Test
    void allowsDocumentedTransitions() {
        Map<SubscriptionStatus, java.util.Set<SubscriptionStatus>> allowed = new EnumMap<>(SubscriptionStatus.class);
        allowed.put(SubscriptionStatus.TRIAL,
                java.util.Set.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED));
        allowed.put(SubscriptionStatus.ACTIVE,
                java.util.Set.of(SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED));
        allowed.put(SubscriptionStatus.PAST_DUE,
                java.util.Set.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED));
        allowed.put(SubscriptionStatus.CANCELED, java.util.Set.of(SubscriptionStatus.ACTIVE));
        allowed.put(SubscriptionStatus.EXPIRED, java.util.Set.of(SubscriptionStatus.ACTIVE));

        allowed.forEach((current, targets) -> targets.forEach(target ->
                assertEquals(target, stateMachine.transition(current, target))));
    }

    @Test
    void rejectsInvalidTransition() {
        InvalidSubscriptionTransitionException exception = assertThrows(
                InvalidSubscriptionTransitionException.class,
                () -> stateMachine.transition(SubscriptionStatus.TRIAL, SubscriptionStatus.EXPIRED));

        assertThat(exception).hasMessage("Cannot transition subscription from TRIAL to EXPIRED");
    }
}
