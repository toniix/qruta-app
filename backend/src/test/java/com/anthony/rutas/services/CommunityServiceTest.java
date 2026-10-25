package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateCommunityCommentRequest;
import com.anthony.rutas.dtos.request.CreateCommunityPostRequest;
import com.anthony.rutas.dtos.response.CommunityCommentResponse;
import com.anthony.rutas.dtos.response.CommunityPostResponse;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("CommunityService Unit Tests")
@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {

    @Mock
    private CommunityPostRepository postRepository;

    @Mock
    private CommunityCommentRepository commentRepository;

    @Mock
    private CommunityPostLikeRepository likeRepository;

    @Mock
    private RouteRepository routeRepository;

    @Mock
    private CityRepository cityRepository;

    @InjectMocks
    private CommunityService communityService;

    private final String deviceA = "device-alpha-123456";
    private final String deviceB = "device-bravo-654321";
    private UUID postId;
    private CommunityPost samplePost;

    @BeforeEach
    void setUp() {
        postId = UUID.randomUUID();
        samplePost = CommunityPost.builder()
                .id(postId)
                .authorAlias("Carlos")
                .authorDeviceId(deviceA)
                .category(PostCategory.ALERTA)
                .content("Tráfico denso en av. San Martín")
                .likesCount(5)
                .commentsCount(2)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("getPosts tests")
    class GetPostsTests {

        @Test
        @DisplayName("Returns mapped posts with likedByMe and ownedByMe flags")
        void getPostsSuccess() {
            when(postRepository.findFilteredPosts(eq(PostCategory.ALERTA), isNull(), isNull(), any(PageRequest.class)))
                    .thenReturn(List.of(samplePost));
            when(likeRepository.findLikedPostIdsByDeviceIdAndPostIds(eq(deviceA), anyList()))
                    .thenReturn(Set.of(postId));

            List<CommunityPostResponse> result = communityService.getPosts(
                    PostCategory.ALERTA, null, null, 20, 0, "recent", deviceA);

            assertEquals(1, result.size());
            CommunityPostResponse resp = result.get(0);
            assertEquals(postId, resp.getId());
            assertTrue(resp.isLikedByMe());
            assertTrue(resp.isOwnedByMe());
            assertEquals("Carlos", resp.getAuthorAlias());
        }

        @Test
        @DisplayName("Uses findFilteredPostsByLikes when sort is popular")
        void getPostsPopularSort() {
            when(postRepository.findFilteredPostsByLikes(isNull(), isNull(), isNull(), any(PageRequest.class)))
                    .thenReturn(List.of(samplePost));
            when(likeRepository.findLikedPostIdsByDeviceIdAndPostIds(eq(deviceB), anyList()))
                    .thenReturn(Collections.emptySet());

            List<CommunityPostResponse> result = communityService.getPosts(
                    null, null, null, 10, 0, "popular", deviceB);

            assertEquals(1, result.size());
            assertFalse(result.get(0).isLikedByMe());
            assertFalse(result.get(0).isOwnedByMe());
            verify(postRepository).findFilteredPostsByLikes(isNull(), isNull(), isNull(), any(PageRequest.class));
            verify(postRepository, never()).findFilteredPosts(any(), any(), any(), any());
        }
    }

    @Nested
    @DisplayName("createPost tests")
    class CreatePostTests {

        @Test
        @DisplayName("Creates post with sanitized text and zero initial counters")
        void createPostSuccess() {
            CreateCommunityPostRequest req = new CreateCommunityPostRequest();
            req.setAuthorAlias("  Maria G.  ");
            req.setCategory(PostCategory.PREGUNTA);
            req.setContent("¿Alguien sabe el horario de la línea 1?");

            when(postRepository.save(any(CommunityPost.class))).thenAnswer(invocation -> {
                CommunityPost p = invocation.getArgument(0);
                p.setId(UUID.randomUUID());
                p.setCreatedAt(LocalDateTime.now());
                return p;
            });

            CommunityPostResponse response = communityService.createPost(req, deviceA);

            assertNotNull(response);
            assertEquals("Maria G.", response.getAuthorAlias());
            assertEquals(PostCategory.PREGUNTA, response.getCategory());
            assertEquals("¿Alguien sabe el horario de la línea 1?", response.getContent());
            assertEquals(0, response.getLikesCount());
            assertEquals(0, response.getCommentsCount());
            assertTrue(response.isOwnedByMe());
            assertFalse(response.isLikedByMe());
        }

        @Test
        @DisplayName("Rejects short or missing deviceId")
        void rejectInvalidDeviceId() {
            CreateCommunityPostRequest req = new CreateCommunityPostRequest();
            req.setAuthorAlias("Maria");
            req.setCategory(PostCategory.ALERTA);
            req.setContent("Alerta de ruta");

            assertThrows(BadRequestException.class, () -> communityService.createPost(req, "short"));
            assertThrows(BadRequestException.class, () -> communityService.createPost(req, null));
        }

        @Test
        @DisplayName("Rejects honeypot submission")
        void rejectHoneypot() {
            CreateCommunityPostRequest req = new CreateCommunityPostRequest();
            req.setAuthorAlias("Maria");
            req.setCategory(PostCategory.ALERTA);
            req.setContent("Alerta de ruta");
            req.setWebsite("http://spammer.com");

            assertThrows(BadRequestException.class, () -> communityService.createPost(req, deviceA));
        }
    }

    @Nested
    @DisplayName("toggleLike with atomic counter & concurrency tests")
    class ToggleLikeTests {

        @Test
        @DisplayName("Removes like atomically when existing like is found")
        void toggleLikeRemove() {
            when(postRepository.findByIdWithDetails(postId)).thenReturn(Optional.of(samplePost));
            CommunityPostLike existingLike = CommunityPostLike.builder()
                    .id(UUID.randomUUID())
                    .post(samplePost)
                    .deviceId(deviceA)
                    .build();
            when(likeRepository.findByPost_IdAndDeviceId(postId, deviceA)).thenReturn(Optional.of(existingLike));

            CommunityPostResponse response = communityService.toggleLike(postId, deviceA);

            verify(likeRepository).delete(existingLike);
            verify(likeRepository).flush();
            verify(postRepository).adjustLikesCount(postId, -1);
            assertFalse(response.isLikedByMe());
        }

        @Test
        @DisplayName("Adds like atomically when no previous like exists")
        void toggleLikeAdd() {
            when(postRepository.findByIdWithDetails(postId)).thenReturn(Optional.of(samplePost));
            when(likeRepository.findByPost_IdAndDeviceId(postId, deviceA)).thenReturn(Optional.empty());

            CommunityPostResponse response = communityService.toggleLike(postId, deviceA);

            verify(likeRepository).saveAndFlush(any(CommunityPostLike.class));
            verify(postRepository).adjustLikesCount(postId, 1);
            assertTrue(response.isLikedByMe());
        }

        @Test
        @DisplayName("Handles concurrent duplicate like gracefully via DataIntegrityViolationException")
        void toggleLikeConcurrentDuplicate() {
            when(postRepository.findByIdWithDetails(postId)).thenReturn(Optional.of(samplePost));
            when(likeRepository.findByPost_IdAndDeviceId(postId, deviceA)).thenReturn(Optional.empty());
            doThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"))
                    .when(likeRepository).saveAndFlush(any(CommunityPostLike.class));

            CommunityPostResponse response = communityService.toggleLike(postId, deviceA);

            assertTrue(response.isLikedByMe());
            verify(postRepository, never()).adjustLikesCount(postId, 1);
        }
    }

    @Nested
    @DisplayName("Rate limiting tests")
    class RateLimitingTests {

        @Test
        @DisplayName("Post rate limit triggers when posting twice consecutively")
        void rateLimitPostingConsecutive() {
            String freshDevice = "device-fresh-post-123456";
            CreateCommunityPostRequest req = new CreateCommunityPostRequest();
            req.setAuthorAlias("Usuario");
            req.setCategory(PostCategory.ALERTA);
            req.setContent("Primera alerta válida");

            when(postRepository.save(any(CommunityPost.class))).thenAnswer(invocation -> {
                CommunityPost p = invocation.getArgument(0);
                p.setId(UUID.randomUUID());
                return p;
            });

            // First post succeeds
            communityService.createPost(req, freshDevice);

            // Immediate second post must throw BadRequestException
            assertThrows(BadRequestException.class, () -> communityService.createPost(req, freshDevice));
        }

        @Test
        @DisplayName("Separate action cooldowns: posting does not block commenting")
        void rateLimitSeparateActionCooldowns() {
            String freshDevice = "device-fresh-dual-123456";
            CreateCommunityPostRequest postReq = new CreateCommunityPostRequest();
            postReq.setAuthorAlias("Usuario");
            postReq.setCategory(PostCategory.ALERTA);
            postReq.setContent("Post para probar cooldown");

            when(postRepository.save(any(CommunityPost.class))).thenAnswer(invocation -> {
                CommunityPost p = invocation.getArgument(0);
                p.setId(UUID.randomUUID());
                return p;
            });

            // 1. Create post
            communityService.createPost(postReq, freshDevice);

            // 2. Add comment immediately on another post - should NOT be blocked by post cooldown
            when(postRepository.findById(postId)).thenReturn(Optional.of(samplePost));
            when(commentRepository.save(any(CommunityComment.class))).thenAnswer(inv -> {
                CommunityComment c = inv.getArgument(0);
                c.setId(UUID.randomUUID());
                return c;
            });

            CreateCommunityCommentRequest commentReq = new CreateCommunityCommentRequest();
            commentReq.setAuthorAlias("Usuario");
            commentReq.setContent("Comentario inmediato permitido");

            CommunityCommentResponse commentResp = communityService.addComment(postId, commentReq, freshDevice);
            assertNotNull(commentResp);
            verify(postRepository).adjustCommentsCount(postId, 1);
        }
    }

    @Nested
    @DisplayName("Offensive words validation tests")
    class OffensiveWordsTests {

        @Test
        @DisplayName("Rejects post with banned offensive word in content")
        void rejectOffensiveWordInContent() {
            CreateCommunityPostRequest req = new CreateCommunityPostRequest();
            req.setAuthorAlias("Usuario");
            req.setCategory(PostCategory.ALERTA);
            req.setContent("Esto es una mierda total");

            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> communityService.createPost(req, "dev-offensive-12345"));
            assertTrue(ex.getMessage().contains("lenguaje inapropiado"));
        }

        @Test
        @DisplayName("Rejects post with accented offensive word normalized (e.g. imbécil)")
        void rejectAccentedOffensiveWord() {
            CreateCommunityPostRequest req = new CreateCommunityPostRequest();
            req.setAuthorAlias("Usuario");
            req.setCategory(PostCategory.ALERTA);
            req.setContent("Eres un imbécil");

            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> communityService.createPost(req, "dev-offensive-67890"));
            assertTrue(ex.getMessage().contains("lenguaje inapropiado"));
        }

        @Test
        @DisplayName("Rejects offensive word in author alias")
        void rejectOffensiveWordInAlias() {
            CreateCommunityPostRequest req = new CreateCommunityPostRequest();
            req.setAuthorAlias("El_cojudo");
            req.setCategory(PostCategory.ALERTA);
            req.setContent("Contenido normal");

            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> communityService.createPost(req, "dev-offensive-alias-123"));
            assertTrue(ex.getMessage().contains("lenguaje inapropiado"));
        }
    }

    @Nested
    @DisplayName("deleteOwnPost & deleteOwnComment tests")
    class DeleteOwnTests {

        @Test
        @DisplayName("Author can delete their own post")
        void deleteOwnPostSuccess() {
            when(postRepository.findById(postId)).thenReturn(Optional.of(samplePost));

            communityService.deleteOwnPost(postId, deviceA);

            verify(postRepository).delete(samplePost);
        }

        @Test
        @DisplayName("Non-author cannot delete someone else's post")
        void deleteOwnPostForbidden() {
            when(postRepository.findById(postId)).thenReturn(Optional.of(samplePost));

            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> communityService.deleteOwnPost(postId, deviceB));
            assertTrue(ex.getMessage().contains("Solo puedes eliminar tus propias publicaciones"));
            verify(postRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Throws ResourceNotFoundException when post does not exist")
        void deleteNonExistentPost() {
            when(postRepository.findById(postId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> communityService.deleteOwnPost(postId, deviceA));
        }

        @Test
        @DisplayName("Author can delete their own comment and decrements comments count atomically")
        void deleteOwnCommentSuccess() {
            UUID commentId = UUID.randomUUID();
            CommunityComment comment = CommunityComment.builder()
                    .id(commentId)
                    .post(samplePost)
                    .authorDeviceId(deviceA)
                    .content("Comentario")
                    .build();

            when(commentRepository.findByIdWithPost(commentId)).thenReturn(Optional.of(comment));

            communityService.deleteOwnComment(commentId, deviceA);

            verify(commentRepository).delete(comment);
            verify(postRepository).adjustCommentsCount(postId, -1);
        }
    }
}
