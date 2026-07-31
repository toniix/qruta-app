package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.City;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRepository extends JpaRepository<City, Long> {
}
