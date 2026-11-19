package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.OperatorUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface OperatorUserRepository extends JpaRepository<OperatorUser, UUID> {

    Optional<OperatorUser> findByEmailIgnoreCase(String email);

    @Query("SELECT u FROM OperatorUser u JOIN FETCH u.operator WHERE LOWER(u.email) = LOWER(:email)")
    Optional<OperatorUser> findByEmailWithOperator(@Param("email") String email);
}
