package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.CommunityComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunityCommentRepository extends JpaRepository<CommunityComment, UUID> {

    List<CommunityComment> findByPost_IdOrderByCreatedAtAsc(UUID postId);

    @Query("SELECT c FROM CommunityComment c JOIN FETCH c.post p WHERE c.id = :id")
    Optional<CommunityComment> findByIdWithPost(@Param("id") UUID id);
}
