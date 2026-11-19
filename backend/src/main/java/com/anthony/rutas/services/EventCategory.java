package com.anthony.rutas.services;

import java.util.Set;

/** Controlled vocabulary of usage event categories. Mirrors the CHECK constraint in V2. */
public final class EventCategory {

    public static final String ROUTE_VIEW = "route_view";
    public static final String ROUTE_SEARCH = "route_search";
    public static final String STOP_VIEW = "stop_view";
    public static final String NEARBY_QUERY = "nearby_query";
    public static final String QR_SCAN = "qr_scan";
    public static final String COMMUNITY_POST = "community_post";

    public static final Set<String> ALL = Set.of(
            ROUTE_VIEW, ROUTE_SEARCH, STOP_VIEW, NEARBY_QUERY, QR_SCAN, COMMUNITY_POST);

    private EventCategory() {
    }

    public static boolean isValid(String category) {
        return category != null && ALL.contains(category);
    }
}
