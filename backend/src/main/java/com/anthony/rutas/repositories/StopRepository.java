package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.Stop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StopRepository extends JpaRepository<Stop, UUID> {

    List<Stop> findByNameContainingIgnoreCase(String name);

    @Query("SELECT s FROM Stop s WHERE s.city.id = :cityId ORDER BY s.name ASC")
    List<Stop> findByCityId(@Param("cityId") UUID cityId);

    @Query("SELECT s FROM Stop s WHERE s.id = :id AND s.city.id = :cityId")
    Optional<Stop> findByIdAndCityId(@Param("id") UUID id, @Param("cityId") UUID cityId);

    @Query("SELECT s FROM Stop s LEFT JOIN FETCH s.city ORDER BY s.name ASC")
    List<Stop> findAllWithCity();

    @Query(value = "SELECT * FROM stops s " +
           "WHERE ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius) " +
           "ORDER BY ST_Distance(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)",
           nativeQuery = true)
    List<Stop> findNearby(@Param("lat") double latitude, @Param("lng") double longitude, @Param("radius") double radiusMeters);
}
