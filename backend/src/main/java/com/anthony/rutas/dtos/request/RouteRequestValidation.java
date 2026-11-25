package com.anthony.rutas.dtos.request;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

/** Shared invariant checks for ordered route request items. */
final class RouteRequestValidation {

    private RouteRequestValidation() {
    }

    interface PointOrder {
        Integer getPointOrder();
    }

    interface StopOrder {
        Integer getStopOrder();
    }

    interface StopId {
        String getStopId();
    }

    static boolean uniquePointOrders(List<? extends PointOrder> points) {
        if (points == null) return true;
        List<Integer> values = points.stream()
                .filter(Objects::nonNull)
                .map(PointOrder::getPointOrder)
                .filter(Objects::nonNull)
                .toList();
        return values.stream().distinct().count() == values.size();
    }

    static boolean uniqueStopOrders(List<? extends StopOrder> stops) {
        if (stops == null) return true;
        List<Integer> values = stops.stream()
                .filter(Objects::nonNull)
                .map(StopOrder::getStopOrder)
                .filter(Objects::nonNull)
                .toList();
        return values.stream().distinct().count() == values.size();
    }

    static boolean uniqueStopIds(List<? extends StopId> stops) {
        if (stops == null) return true;
        List<String> values = stops.stream()
                .filter(Objects::nonNull)
                .map(StopId::getStopId)
                .filter(Objects::nonNull)
                .map(id -> id.trim().toLowerCase(Locale.ROOT))
                .toList();
        return values.stream().distinct().count() == values.size();
    }

    static boolean uniqueDirections(List<String> directions) {
        if (directions == null) return true;
        List<String> values = directions.stream().filter(Objects::nonNull).toList();
        return values.stream().distinct().count() == values.size();
    }
}
