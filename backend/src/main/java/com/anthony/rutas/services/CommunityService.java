package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateCommunityCommentRequest;
import com.anthony.rutas.dtos.request.CreateCommunityPostRequest;
import com.anthony.rutas.dtos.response.CommunityCommentResponse;
import com.anthony.rutas.dtos.response.CommunityPostResponse;
import com.anthony.rutas.dtos.response.RouteCommunitySummaryResponse;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.*;
import com.github.benmanes.caffeine.cache.Caffeine;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityPostRepository postRepository;
    private final CommunityCommentRepository commentRepository;
    private final CommunityPostLikeRepository likeRepository;
    private final RouteRepository routeRepository;
    private final CityRepository cityRepository;

    private static final int MAX_POSTS_LIMIT = 60;
    private static final long COOLDOWN_MS = 8_000L;

    // Rate-limit con TTL: evita mapa sin tope y reseteos por reinicio en una sola
    // instancia.
    // NOTA: con múltiples instancias usar Redis/DB; sin login es el compromiso
    // aceptado.
    private final com.github.benmanes.caffeine.cache.Cache<String, Long> rateLimitCache = Caffeine.newBuilder()
            .expireAfterWrite(30, TimeUnit.SECONDS)
            .maximumSize(10_000)
            .build();

    // Basic list of offensive words in Spanish to keep the community respectful
    private static final Set<String> BANNED_WORDS = Set.of(
            "mierda", "puto", "puta", "carajo", "conchatumadre", "ctm",
            "huevon", "weon", "imbecil", "idiota", "estupido", "pendejo",
            "cojudo", "malparido", "hdp");

    private static final Pattern WORD_SPLIT = Pattern.compile("[^a-z0-9]+");

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> getPosts(
            PostCategory category,
            UUID routeId,
            UUID cityId,
            Integer limit,
            Integer page,
            String sort,
            String deviceId) {
        int safeLimit = (limit != null && limit > 0 && limit <= MAX_POSTS_LIMIT) ? limit : 20;
        int safePage = (page != null && page >= 0 && page <= 1000) ? page : 0;
        boolean byLikes = "popular".equalsIgnoreCase(sort);
        List<CommunityPost> posts = byLikes
                ? postRepository.findFilteredPostsByLikes(
                        category, routeId, cityId, PageRequest.of(safePage, safeLimit))
                : postRepository.findFilteredPosts(
                        category, routeId, cityId, PageRequest.of(safePage, safeLimit));

        if (posts.isEmpty()) {
            return List.of();
        }

        Set<UUID> likedIds = resolveLikedPostIds(deviceId, posts);

        return posts.stream()
                .map(post -> toPostResponse(post, deviceId, likedIds.contains(post.getId())))
                .collect(Collectors.toList());
    }

    /** Compat: callers antiguos sin paginación (página 0, orden recientes). */
    @Transactional(readOnly = true)
    public List<CommunityPostResponse> getPosts(
            PostCategory category,
            UUID routeId,
            UUID cityId,
            Integer limit,
            String deviceId) {
        return getPosts(category, routeId, cityId, limit, 0, "recent", deviceId);
    }

    @Transactional(readOnly = true)
    public RouteCommunitySummaryResponse getRouteSummary(UUID routeId, String deviceId) {
        long totalCount = postRepository.countByRoute_Id(routeId);
        long alertsCount = postRepository.countByRoute_IdAndCategory(routeId, PostCategory.ALERTA);

        List<CommunityPost> latestList = postRepository.findLatestByRouteId(routeId, PageRequest.of(0, 1));
        CommunityPostResponse latestPost = null;
        if (!latestList.isEmpty()) {
            CommunityPost post = latestList.get(0);
            Set<UUID> likedIds = resolveLikedPostIds(deviceId, List.of(post));
            latestPost = toPostResponse(post, deviceId, likedIds.contains(post.getId()));
        }

        return RouteCommunitySummaryResponse.builder()
                .routeId(routeId)
                .totalPostsCount(totalCount)
                .activeAlertsCount(alertsCount)
                .latestPost(latestPost)
                .build();
    }

    @Transactional
    public CommunityPostResponse createPost(CreateCommunityPostRequest request, String deviceId) {
        rejectHoneypot(request.getWebsite());
        String cleanDeviceId = requireDeviceId(deviceId);
        enforceRateLimit(cleanDeviceId, "post");

        String cleanAlias = sanitizeText(request.getAuthorAlias());
        String cleanContent = sanitizeText(request.getContent());

        validateCleanContent(cleanAlias);
        validateCleanContent(cleanContent);

        Route route = null;
        if (request.getRouteId() != null) {
            route = routeRepository.findById(request.getRouteId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Ruta no encontrada con ID: " + request.getRouteId()));
        }

        City city = null;
        if (request.getCityId() != null) {
            city = cityRepository.findById(request.getCityId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Ciudad no encontrada con ID: " + request.getCityId()));
        }

        CommunityPost post = CommunityPost.builder()
                .authorAlias(cleanAlias)
                .authorDeviceId(cleanDeviceId)
                .category(request.getCategory())
                .content(cleanContent)
                .route(route)
                .city(city)
                .likesCount(0)
                .commentsCount(0)
                .build();

        CommunityPost saved = postRepository.save(post);
        return toPostResponse(saved, cleanDeviceId, false);
    }

    @Transactional
    public void deleteOwnPost(UUID postId, String deviceId) {
        String cleanDeviceId = requireDeviceId(deviceId);
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicación no encontrada"));

        if (!post.getAuthorDeviceId().equals(cleanDeviceId)) {
            throw new BadRequestException("Solo puedes eliminar tus propias publicaciones");
        }

        postRepository.delete(post);
    }

    @Transactional
    public CommunityPostResponse toggleLike(UUID postId, String deviceId) {
        String cleanDeviceId = requireDeviceId(deviceId);
        CommunityPost post = postRepository.findByIdWithDetails(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicación no encontrada"));

        Optional<CommunityPostLike> existing = likeRepository.findByPost_IdAndDeviceId(postId, cleanDeviceId);
        boolean likedByMe;

        if (existing.isPresent()) {
            likeRepository.delete(existing.get());
            likeRepository.flush();
            postRepository.adjustLikesCount(postId, -1);
            likedByMe = false;
        } else {
            CommunityPostLike newLike = CommunityPostLike.builder()
                    .post(post)
                    .deviceId(cleanDeviceId)
                    .build();
            try {
                likeRepository.saveAndFlush(newLike);
                postRepository.adjustLikesCount(postId, 1);
                likedByMe = true;
            } catch (DataIntegrityViolationException ex) {
                likedByMe = true;
            }
        }

        CommunityPost updated = postRepository.findByIdWithDetails(postId).orElse(post);
        return toPostResponse(updated, cleanDeviceId, likedByMe);
    }

    @Transactional(readOnly = true)
    public List<CommunityCommentResponse> getComments(UUID postId, String deviceId) {
        if (!postRepository.existsById(postId)) {
            throw new ResourceNotFoundException("Publicación no encontrada");
        }

        return commentRepository.findByPost_IdOrderByCreatedAtAsc(postId)
                .stream()
                .map(c -> toCommentResponse(c, deviceId))
                .collect(Collectors.toList());
    }

    @Transactional
    public CommunityCommentResponse addComment(UUID postId, CreateCommunityCommentRequest request, String deviceId) {
        rejectHoneypot(request.getWebsite());
        String cleanDeviceId = requireDeviceId(deviceId);
        enforceRateLimit(cleanDeviceId, "comment");

        String cleanAlias = sanitizeText(request.getAuthorAlias());
        String cleanContent = sanitizeText(request.getContent());

        validateCleanContent(cleanAlias);
        validateCleanContent(cleanContent);

        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicación no encontrada"));

        CommunityComment comment = CommunityComment.builder()
                .post(post)
                .authorAlias(cleanAlias)
                .authorDeviceId(cleanDeviceId)
                .content(cleanContent)
                .build();

        CommunityComment saved = commentRepository.save(comment);
        postRepository.adjustCommentsCount(postId, 1);

        return toCommentResponse(saved, cleanDeviceId);
    }

    @Transactional
    public void deleteOwnComment(UUID commentId, String deviceId) {
        String cleanDeviceId = requireDeviceId(deviceId);
        CommunityComment comment = commentRepository.findByIdWithPost(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comentario no encontrado"));

        if (!comment.getAuthorDeviceId().equals(cleanDeviceId)) {
            throw new BadRequestException("Solo puedes eliminar tus propios comentarios");
        }

        UUID postId = comment.getPost() != null ? comment.getPost().getId() : null;
        commentRepository.delete(comment);

        if (postId != null) {
            postRepository.adjustCommentsCount(postId, -1);
        }
    }

    /* ── Admin Moderation Methods ─────────────────────────────────────── */

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> getAdminPosts() {
        return postRepository.findFilteredPosts(null, null, null, PageRequest.of(0, 100))
                .stream()
                .map(p -> toPostResponse(p, null, false))
                .collect(Collectors.toList());
    }

    @Transactional
    public void adminDeletePost(UUID postId) {
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicación no encontrada con ID: " + postId));
        postRepository.delete(post);
    }

    @Transactional
    public void adminDeleteComment(UUID commentId) {
        CommunityComment comment = commentRepository.findByIdWithPost(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comentario no encontrado con ID: " + commentId));
        UUID postId = comment.getPost() != null ? comment.getPost().getId() : null;
        commentRepository.delete(comment);
        if (postId != null) {
            postRepository.adjustCommentsCount(postId, -1);
        }
    }

    /* ── Helpers ──────────────────────────────────────────────────────── */

    private String requireDeviceId(String deviceId) {
        if (deviceId == null || deviceId.isBlank() || deviceId.trim().length() < 6) {
            throw new BadRequestException("Identificador de dispositivo inválido (X-Device-Id)");
        }
        String trimmed = deviceId.trim();
        return trimmed.length() > 64 ? trimmed.substring(0, 64) : trimmed;
    }

    private void enforceRateLimit(String deviceId, String action) {
        long now = System.currentTimeMillis();
        String key = deviceId + ":" + action;
        Long previous = rateLimitCache.getIfPresent(key);
        if (previous != null && (now - previous) < COOLDOWN_MS) {
            String msg = "comment".equalsIgnoreCase(action)
                    ? "Por favor espera unos segundos antes de volver a comentar."
                    : "Por favor espera unos segundos antes de volver a publicar.";
            throw new BadRequestException(msg);
        }
        rateLimitCache.put(key, now);
    }

    private void rejectHoneypot(String website) {
        if (website != null && !website.isBlank()) {
            throw new BadRequestException("No se pudo procesar la solicitud.");
        }
    }

    private String sanitizeText(String raw) {
        if (raw == null)
            return "";
        return raw.trim().replaceAll("\\s{3,}", "  ");
    }

    private void validateCleanContent(String text) {
        String normalized = Normalizer.normalize(text.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        String[] tokens = WORD_SPLIT.split(normalized);
        for (String token : tokens) {
            if (BANNED_WORDS.contains(token)) {
                throw new BadRequestException(
                        "El mensaje contiene lenguaje inapropiado. Mantengamos el respeto en la comunidad.");
            }
        }
    }

    private Set<UUID> resolveLikedPostIds(String deviceId, List<CommunityPost> posts) {
        if (deviceId == null || deviceId.isBlank() || posts.isEmpty()) {
            return Collections.emptySet();
        }
        List<UUID> postIds = posts.stream().map(CommunityPost::getId).toList();
        return likeRepository.findLikedPostIdsByDeviceIdAndPostIds(deviceId.trim(), postIds);
    }

    private CommunityPostResponse toPostResponse(CommunityPost post, String deviceId, boolean likedByMe) {
        boolean ownedByMe = deviceId != null && !deviceId.isBlank()
                && deviceId.trim().equals(post.getAuthorDeviceId());

        Route route = post.getRoute();
        City city = post.getCity();
        TransportLine line = (route != null) ? route.getTransportLine() : null;
        if (city == null && line != null) {
            city = line.getCity();
        }

        return CommunityPostResponse.builder()
                .id(post.getId())
                .authorAlias(post.getAuthorAlias())
                .category(post.getCategory())
                .content(post.getContent())
                .likesCount(post.getLikesCount())
                .commentsCount(post.getCommentsCount())
                .likedByMe(likedByMe)
                .ownedByMe(ownedByMe)
                .createdAt(post.getCreatedAt())
                .routeId(route != null ? route.getId() : null)
                .routeCode(route != null ? route.getCode() : null)
                .routeName(route != null ? route.getName() : null)
                .routeColor(route != null ? route.getColor() : null)
                .lineId(line != null ? line.getId() : null)
                .lineCode(line != null ? line.getCode() : null)
                .lineName(line != null ? line.getName() : null)
                .cityId(city != null ? city.getId() : null)
                .cityName(city != null ? city.getName() : null)
                .build();
    }

    private CommunityCommentResponse toCommentResponse(CommunityComment comment, String deviceId) {
        boolean ownedByMe = deviceId != null && !deviceId.isBlank()
                && deviceId.trim().equals(comment.getAuthorDeviceId());

        return CommunityCommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost() != null ? comment.getPost().getId() : null)
                .authorAlias(comment.getAuthorAlias())
                .content(comment.getContent())
                .ownedByMe(ownedByMe)
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
