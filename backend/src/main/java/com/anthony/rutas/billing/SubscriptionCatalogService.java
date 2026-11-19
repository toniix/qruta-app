package com.anthony.rutas.billing;

import com.anthony.rutas.exceptions.BadRequestException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;

@Component
public class SubscriptionCatalogService {

    private static final Set<String> SUPPORTED_PLANS = Set.of("PRO");

    public boolean supports(String plan) {
        return plan != null && SUPPORTED_PLANS.contains(plan.trim().toUpperCase(Locale.ROOT));
    }

    public String normalize(String plan, String fallback) {
        String candidate = plan == null || plan.isBlank() ? fallback : plan;
        String normalized = candidate == null ? "" : candidate.trim().toUpperCase(Locale.ROOT);
        if (!supports(normalized)) {
            throw new BadRequestException("Unsupported plan: " + candidate);
        }
        return normalized;
    }

    public BigDecimal amount(String plan) {
        return new BigDecimal("49.00");
    }

    public String currency(String plan) {
        return "PEN";
    }
}
