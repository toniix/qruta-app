package com.anthony.rutas.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One row per route per day (or one city-level rollup row with a null route). Rebuilt
 * from {@link RouteEvent} by {@code RouteAnalyticsService}; never written by hand.
 */
@Entity
@Table(name = "route_daily_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteDailyStat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "route_id")
    private UUID routeId;

    @Column(name = "transport_line_id")
    private UUID transportLineId;

    @Column(name = "city_id", nullable = false)
    private UUID cityId;

    @Column(nullable = false)
    private LocalDate date;

    @Builder.Default
    private int views = 0;

    @Builder.Default
    private int searches = 0;

    @Builder.Default
    @Column(name = "qr_scans")
    private int qrScans = 0;

    @Builder.Default
    @Column(name = "stop_views")
    private int stopViews = 0;

    @Builder.Default
    @Column(name = "nearby_queries")
    private int nearbyQueries = 0;

    @Builder.Default
    @Column(name = "community_posts")
    private int communityPosts = 0;

    @Builder.Default
    @Column(name = "unique_devices")
    private int uniqueDevices = 0;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
