package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.CommunityPost;
import com.anthony.rutas.entities.PostCategory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, UUID> {

       @Query("SELECT p FROM CommunityPost p " +
                     "LEFT JOIN FETCH p.route r " +
                     "LEFT JOIN FETCH r.transportLine tl " +
                     "LEFT JOIN FETCH p.city c " +
                     "WHERE (:category IS NULL OR p.category = :category) " +
                     "AND (:routeId IS NULL OR r.id = :routeId) " +
                     "AND (:cityId IS NULL OR c.id = :cityId) " +
                     "ORDER BY p.createdAt DESC")
       List<CommunityPost> findFilteredPosts(
                     @Param("category") PostCategory category,
                     @Param("routeId") UUID routeId,
                     @Param("cityId") UUID cityId,
                     Pageable pageable);

       @Query("SELECT p FROM CommunityPost p " +
                     "LEFT JOIN FETCH p.route r " +
                     "LEFT JOIN FETCH r.transportLine tl " +
                     "LEFT JOIN FETCH p.city c " +
                     "WHERE (:category IS NULL OR p.category = :category) " +
                     "AND (:routeId IS NULL OR r.id = :routeId) " +
                     "AND (:cityId IS NULL OR c.id = :cityId) " +
                     "ORDER BY p.likesCount DESC, p.createdAt DESC")
       List<CommunityPost> findFilteredPostsByLikes(
                     @Param("category") PostCategory category,
                     @Param("routeId") UUID routeId,
                     @Param("cityId") UUID cityId,
                     Pageable pageable);

       @Query("SELECT p FROM CommunityPost p " +
                     "LEFT JOIN FETCH p.route r " +
                     "LEFT JOIN FETCH r.transportLine tl " +
                     "LEFT JOIN FETCH p.city c " +
                     "WHERE p.id = :id")
       Optional<CommunityPost> findByIdWithDetails(@Param("id") UUID id);

       @Query("SELECT p FROM CommunityPost p " +
                     "LEFT JOIN FETCH p.route r " +
                     "LEFT JOIN FETCH p.city c " +
                     "WHERE r.id = :routeId " +
                     "ORDER BY p.createdAt DESC")
       List<CommunityPost> findLatestByRouteId(@Param("routeId") UUID routeId, Pageable pageable);

       long countByRoute_Id(UUID routeId);

       long countByRoute_IdAndCategory(UUID routeId, PostCategory category);
}
