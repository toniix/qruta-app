package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.request.CreateCommunityCommentRequest;
import com.anthony.rutas.dtos.request.CreateCommunityPostRequest;
import com.anthony.rutas.dtos.response.CommunityCommentResponse;
import com.anthony.rutas.dtos.response.CommunityPostResponse;
import com.anthony.rutas.dtos.response.RouteCommunitySummaryResponse;
import com.anthony.rutas.entities.PostCategory;
import com.anthony.rutas.services.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping("/posts")
    public ResponseEntity<List<CommunityPostResponse>> getPosts(
            @RequestParam(required = false) PostCategory category,
            @RequestParam(required = false) UUID routeId,
            @RequestParam(required = false) UUID cityId,
            @RequestParam(required = false) Integer limit,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId
    ) {
        return ResponseEntity.ok(communityService.getPosts(category, routeId, cityId, limit, deviceId));
    }

    @PostMapping("/posts")
    public ResponseEntity<CommunityPostResponse> createPost(
            @Valid @RequestBody CreateCommunityPostRequest request,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId
    ) {
        CommunityPostResponse created = communityService.createPost(request, deviceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deleteOwnPost(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId
    ) {
        communityService.deleteOwnPost(id, deviceId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posts/{id}/like")
    public ResponseEntity<CommunityPostResponse> toggleLike(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId
    ) {
        return ResponseEntity.ok(communityService.toggleLike(id, deviceId));
    }

    @GetMapping("/posts/{id}/comments")
    public ResponseEntity<List<CommunityCommentResponse>> getComments(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId
    ) {
        return ResponseEntity.ok(communityService.getComments(id, deviceId));
    }

    @PostMapping("/posts/{id}/comments")
    public ResponseEntity<CommunityCommentResponse> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCommunityCommentRequest request,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId
    ) {
        CommunityCommentResponse created = communityService.addComment(id, request, deviceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteOwnComment(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId
    ) {
        communityService.deleteOwnComment(id, deviceId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/routes/{routeId}/summary")
    public ResponseEntity<RouteCommunitySummaryResponse> getRouteSummary(
            @PathVariable UUID routeId,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId
    ) {
        return ResponseEntity.ok(communityService.getRouteSummary(routeId, deviceId));
    }
}

