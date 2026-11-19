package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.DataLicense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DataLicenseRepository extends JpaRepository<DataLicense, UUID> {
}
