package com.anthony.rutas.dtos.response;

import com.anthony.rutas.entities.PostCategory;
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
public class CommunityPostResponse {

    private UUID id;
    private String authorAlias;
    private PostCategory category;
    private String content;
    private int likesCount;
    private int commentsCount;
    private boolean likedByMe;
    private boolean ownedByMe;
    private LocalDateTime createdAt;

    // Optional route context
    private UUID routeId;
    private String routeCode;
    private String routeName;
    private String routeColor;

    // Optional line context
    private UUID lineId;
    private String lineName;
    private String lineCode;

    // Optional city context
    private UUID cityId;
    private String cityName;
}

