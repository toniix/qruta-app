package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.OperatorUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OperatorUserRepository extends JpaRepository<OperatorUser, UUID> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);

    List<OperatorUser> findByOperatorId(UUID operatorId);

    @Query("SELECT u FROM OperatorUser u JOIN FETCH u.operator WHERE LOWER(u.email) = LOWER(:email)")
    Optional<OperatorUser> findByEmailWithOperator(@Param("email") String email);
}
