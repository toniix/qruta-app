package com.anthony.rutas.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Resolves the operator id from the authenticated principal. Every portal
 * service call goes through here so a token can never reach another
 * operator's data, even if a repository query forgets its scope predicate.
 */
@Component
public class OperatorScope {

    public UUID requireOperatorId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof OperatorPrincipal principal)) {
            throw new AccessDeniedException("Operator context required");
        }
        return principal.getOperatorId();
    }

    public void requireOwned(UUID ownerId) {
        UUID current = requireOperatorId();
        if (ownerId == null || !current.equals(ownerId)) {
            throw new AccessDeniedException("Resource is outside the operator scope");
        }
    }

    public OperatorPrincipal requirePrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof OperatorPrincipal principal)) {
            throw new AccessDeniedException("Operator context required");
        }
        return principal;
    }
}
