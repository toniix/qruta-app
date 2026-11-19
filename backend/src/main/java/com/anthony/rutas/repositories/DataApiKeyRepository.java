package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.DataApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DataApiKeyRepository extends JpaRepository<DataApiKey, UUID> {

    Optional<DataApiKey> findByKeyHash(String keyHash);
}
