package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.Disruption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DisruptionRepository extends JpaRepository<Disruption, UUID> {

    @Query("SELECT d FROM Disruption d JOIN FETCH d.route WHERE d.operator.id = :operatorId ORDER BY d.startsAt DESC")
    List<Disruption> findByOperatorId(@Param("operatorId") UUID operatorId);

    @Query("SELECT d FROM Disruption d JOIN FETCH d.route WHERE d.id = :id AND d.operator.id = :operatorId")
    Optional<Disruption> findByIdAndOperatorId(@Param("id") UUID id, @Param("operatorId") UUID operatorId);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE Disruption d SET d.communityPost = null WHERE d.communityPost.id = :postId")
    int detachCommunityPost(@Param("postId") UUID postId);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM Disruption d WHERE d.route.id = :routeId")
    int deleteByRouteId(@Param("routeId") UUID routeId);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM Disruption d WHERE d.route.transportLine.id = :lineId")
    int deleteByRouteTransportLineId(@Param("lineId") UUID lineId);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM Disruption d WHERE d.route.transportLine.city.id = :cityId")
    int deleteByRouteTransportLineCityId(@Param("cityId") UUID cityId);
}
