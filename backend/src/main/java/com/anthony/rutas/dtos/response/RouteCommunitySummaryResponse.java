package com.anthony.rutas.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteCommunitySummaryResponse {

    private UUID routeId;
    private long totalPostsCount;
    private long activeAlertsCount;
    private CommunityPostResponse latestPost;
}

