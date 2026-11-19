package com.anthony.rutas.billing;

import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Map;

@Component
public class SubscriptionStateMachine {

    private static final Map<SubscriptionStatus, EnumSet<SubscriptionStatus>> ALLOWED_TRANSITIONS = Map.of(
            SubscriptionStatus.TRIAL,
            EnumSet.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED),
            SubscriptionStatus.ACTIVE,
            EnumSet.of(SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED),
            SubscriptionStatus.PAST_DUE,
            EnumSet.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED),
            SubscriptionStatus.CANCELED,
            EnumSet.of(SubscriptionStatus.ACTIVE),
            SubscriptionStatus.EXPIRED,
            EnumSet.of(SubscriptionStatus.ACTIVE));

    public SubscriptionStatus transition(SubscriptionStatus current, SubscriptionStatus target) {
        if (current == target) {
            return current;
        }
        if (!ALLOWED_TRANSITIONS.getOrDefault(current, EnumSet.noneOf(SubscriptionStatus.class)).contains(target)) {
            throw new InvalidSubscriptionTransitionException(current, target);
        }
        return target;
    }
}
