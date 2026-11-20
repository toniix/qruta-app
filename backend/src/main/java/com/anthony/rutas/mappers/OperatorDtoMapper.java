package com.anthony.rutas.mappers;

import com.anthony.rutas.dtos.response.ChangeLogResponse;
import com.anthony.rutas.dtos.response.DisruptionResponse;
import com.anthony.rutas.dtos.response.OperatorLineResponse;
import com.anthony.rutas.dtos.response.OperatorRouteResponse;
import com.anthony.rutas.dtos.response.OperatorStopResponse;
import com.anthony.rutas.entities.ChangeLog;
import com.anthony.rutas.entities.Disruption;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.entities.TransportLine;

import java.util.List;

public final class OperatorDtoMapper {

    private OperatorDtoMapper() {
    }

    public static OperatorLineResponse toLineResponse(TransportLine line, long routeCount) {
        return OperatorLineResponse.builder()
                .id(line.getId())
                .company(line.getCompany())
                .color(line.getColor())
                .company(line.getCompany())
                .contact(line.getContact())
                .description(line.getDescription())
                .status(line.getStatus())
                .routeCount(routeCount)
                .build();
    }

    public static List<OperatorLineResponse> toLineResponses(List<TransportLine> lines) {
        return lines.stream().map(line -> toLineResponse(line, 0L)).toList();
    }

    public static OperatorRouteResponse toRouteResponse(Route route) {
        TransportLine line = route.getTransportLine();
        return OperatorRouteResponse.builder()
                .id(route.getId())
                .code(route.getCode())
                .name(route.getName())
                .category(route.getCategory())
                .color(route.getColor())
                .status(route.getStatus())
                .transportLineId(line != null ? line.getId() : null)
                .transportLineName(line != null ? line.getCompany() : null)
                .updatedAt(route.getUpdatedAt())
                .build();
    }

    public static List<OperatorRouteResponse> toRouteResponses(List<Route> routes) {
        return routes.stream().map(OperatorDtoMapper::toRouteResponse).toList();
    }

    public static OperatorStopResponse toStopResponse(Stop stop) {
        return OperatorStopResponse.builder()
                .id(stop.getId())
                .name(stop.getName())
                .address(stop.getAddress())
                .reference(stop.getReference())
                .keyStop(stop.getKeyStop())
                .accessible(stop.isAccessible())
                .latitude(stop.getLocation() != null ? stop.getLocation().getY() : null)
                .longitude(stop.getLocation() != null ? stop.getLocation().getX() : null)
                .build();
    }

    public static List<OperatorStopResponse> toStopResponses(List<Stop> stops) {
        return stops.stream().map(OperatorDtoMapper::toStopResponse).toList();
    }

    public static DisruptionResponse toDisruptionResponse(Disruption disruption) {
        Route route = disruption.getRoute();
        return DisruptionResponse.builder()
                .id(disruption.getId())
                .routeId(route != null ? route.getId() : null)
                .routeCode(route != null ? route.getCode() : null)
                .routeName(route != null ? route.getName() : null)
                .type(disruption.getType())
                .description(disruption.getDescription())
                .startsAt(disruption.getStartsAt())
                .endsAt(disruption.getEndsAt())
                .active(disruption.isActive())
                .build();
    }

    public static List<DisruptionResponse> toDisruptionResponses(List<Disruption> disruptions) {
        return disruptions.stream().map(OperatorDtoMapper::toDisruptionResponse).toList();
    }

    public static ChangeLogResponse toChangeLogResponse(ChangeLog change) {
        return ChangeLogResponse.builder()
                .id(change.getId())
                .entityType(change.getEntityType())
                .entityId(change.getEntityId())
                .field(change.getField())
                .oldValue(change.getOldValue())
                .newValue(change.getNewValue())
                .authorEmail(change.getAuthorEmail())
                .authorRole(change.getAuthorRole())
                .createdAt(change.getCreatedAt())
                .build();
    }

    public static List<ChangeLogResponse> toChangeLogResponses(List<ChangeLog> changes) {
        return changes.stream().map(OperatorDtoMapper::toChangeLogResponse).toList();
    }
}
