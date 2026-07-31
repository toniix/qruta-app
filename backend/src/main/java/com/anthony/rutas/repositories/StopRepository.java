package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.Stop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface StopRepository extends JpaRepository<Stop, Long> {
    List<Stop> findByNameContainingIgnoreCase(String name);

    @Query(value = "SELECT * FROM stops s " +
           "WHERE ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius) " +
           "ORDER BY ST_Distance(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)",
           nativeQuery = true)
    List<Stop> findNearby(@Param("lat") double latitude, @Param("lng") double longitude, @Param("radius") double radiusMeters);
}
