package com.anthony.rutas.billing;

import com.anthony.rutas.exceptions.BadRequestException;

public class InvalidSubscriptionTransitionException extends BadRequestException {
    public InvalidSubscriptionTransitionException(SubscriptionStatus current, SubscriptionStatus target) {
        super("Cannot transition subscription from %s to %s".formatted(current, target));
    }
}
