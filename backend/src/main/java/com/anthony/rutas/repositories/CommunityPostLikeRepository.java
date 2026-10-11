package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.CommunityPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface CommunityPostLikeRepository extends JpaRepository<CommunityPostLike, UUID> {

    Optional<CommunityPostLike> findByPost_IdAndDeviceId(UUID postId, String deviceId);

    @Query("SELECT l.post.id FROM CommunityPostLike l WHERE l.deviceId = :deviceId AND l.post.id IN :postIds")
    Set<UUID> findLikedPostIdsByDeviceIdAndPostIds(
            @Param("deviceId") String deviceId,
            @Param("postIds") Collection<UUID> postIds
    );
}

