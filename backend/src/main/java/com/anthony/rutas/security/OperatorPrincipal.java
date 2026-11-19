package com.anthony.rutas.security;

import com.anthony.rutas.entities.OperatorUser;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Authenticated operator user. Distinguishes operator tokens from platform admin
 * tokens so every portal query can be scoped by {@link #getOperatorId()}.
 */
@Getter
public class OperatorPrincipal implements UserDetails {

    private final UUID userId;
    private final String email;
    private final String passwordHash;
    private final String fullName;
    private final String operatorRole;
    private final UUID operatorId;
    private final String operatorName;
    private final boolean active;

    public OperatorPrincipal(OperatorUser user) {
        this.userId = user.getId();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.fullName = user.getFullName();
        this.operatorRole = user.getRole();
        this.operatorId = user.getOperator().getId();
        this.operatorName = user.getOperator().getName();
        this.active = user.isActive() && user.getOperator().isActive();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_OPERATOR"));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
