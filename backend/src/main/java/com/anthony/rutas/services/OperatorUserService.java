package com.anthony.rutas.services;

import com.anthony.rutas.entities.OperatorUser;
import com.anthony.rutas.repositories.OperatorUserRepository;
import com.anthony.rutas.security.OperatorPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OperatorUserService {

    private final OperatorUserRepository operatorUserRepository;

    /**
     * Loads an operator user for JWT authentication. Deliberately not a
     * UserDetailsService bean: the platform already has one for administrators,
     * and two beans would make injection ambiguous.
     */
    @Transactional(readOnly = true)
    public UserDetails loadUserDetails(String email) {
        OperatorUser user = operatorUserRepository.findByEmailWithOperator(email)
                .orElseThrow(() -> new UsernameNotFoundException("Operator user not found: " + email));
        return new OperatorPrincipal(user);
    }
}
