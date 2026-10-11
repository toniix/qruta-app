package com.anthony.rutas.controllers;

import com.anthony.rutas.dtos.response.CommunityPostResponse;
import com.anthony.rutas.services.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/community")
@RequiredArgsConstructor
public class AdminCommunityController {

    private final CommunityService communityService;

    @GetMapping("/posts")
    public ResponseEntity<List<CommunityPostResponse>> getAllPosts() {
        return ResponseEntity.ok(communityService.getAdminPosts());
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable UUID id) {
        communityService.adminDeletePost(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable UUID id) {
        communityService.adminDeleteComment(id);
        return ResponseEntity.noContent().build();
    }
}

