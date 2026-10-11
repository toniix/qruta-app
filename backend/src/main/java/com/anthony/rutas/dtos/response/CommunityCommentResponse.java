package com.anthony.rutas.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunityCommentResponse {

    private UUID id;
    private UUID postId;
    private String authorAlias;
    private String content;
    private boolean ownedByMe;
    private LocalDateTime createdAt;
}

