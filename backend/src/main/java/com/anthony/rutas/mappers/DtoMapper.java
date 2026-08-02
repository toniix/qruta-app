package com.anthony.rutas.mappers;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;

import java.util.List;
import java.util.stream.Collectors;

public class DtoMapper {

    public static CityResponse toCityResponse(City city) {
        return CityResponse.builder()
                .id(city.getId())
                .name(city.getName())
                .department(city.getDepartment())
                .country(city.getCountry())
                .build();
    }

    public static TransportLineResponse toTransportLineResponse(TransportLine line) {
        return TransportLineResponse.builder()
                .id(line.getId())
                .cityId(line.getCity().getId())
                .name(line.getName())
                .code(line.getCode())
                .color(line.getColor())
                .company(line.getCompany())
                .contact(line.getContact())
                .description(line.getDescription())
                .status(line.getStatus())
                .build();
    }

    public static RouteSummaryResponse toRouteSummaryResponse(Route route) {
        return RouteSummaryResponse.builder()
                .id(route.getId())
                .code(route.getCode())
                .name(route.getName())
                .color(route.getColor())
                .description(route.getDescription())
                .status(route.getStatus())
                .fare(route.getFare())
                .schedule(route.getSchedule())
                .frequency(route.getFrequency())
                .transportLineId(route.getTransportLine().getId())
                .transportLineName(route.getTransportLine().getName())
                .build();
    }

    public static RouteDetailResponse toRouteDetailResponse(Route route, List<RouteDirection> directions) {
        List<RouteDirectionResponse> directionResponses = directions.stream()
                .map(DtoMapper::toRouteDirectionResponse)
                .collect(Collectors.toList());

        return RouteDetailResponse.builder()
                .id(route.getId())
                .code(route.getCode())
                .name(route.getName())
                .color(route.getColor())
                .description(route.getDescription())
                .status(route.getStatus())
                .fare(route.getFare())
                .schedule(route.getSchedule())
                .frequency(route.getFrequency())
                .transportLineId(route.getTransportLine().getId())
                .transportLineName(route.getTransportLine().getName())
                .directions(directionResponses)
                .build();
    }

    public static RouteDirectionResponse toRouteDirectionResponse(RouteDirection direction) {
        List<StopResponse> stops = direction.getRouteStops().stream()
                .map(rs -> toStopResponse(rs.getStop()))
                .collect(Collectors.toList());

        List<RoutePointResponse> points = direction.getRoutePoints().stream()
                .map(rp -> RoutePointResponse.builder()
                        .pointOrder(rp.getPointOrder())
                        .latitude(rp.getLocation().getY())
                        .longitude(rp.getLocation().getX())
                        .build())
                .collect(Collectors.toList());

        return RouteDirectionResponse.builder()
                .id(direction.getId())
                .direction(direction.getDirection())
                .originName(direction.getOriginName())
                .destinationName(direction.getDestinationName())
                .totalDistanceKm(direction.getTotalDistanceKm())
                .estimatedMinutes(direction.getEstimatedMinutes())
                .stops(stops)
                .routePoints(points)
                .build();
    }

    public static StopResponse toStopResponse(Stop stop) {
        return StopResponse.builder()
                .id(stop.getId())
                .name(stop.getName())
                .latitude(stop.getLocation().getY())
                .longitude(stop.getLocation().getX())
                .reference(stop.getReference())
                .address(stop.getAddress())
                .isAccessible(stop.isAccessible())
                .build();
    }

    public static List<RouteSummaryResponse> toRouteSummaryList(List<Route> routes) {
        return routes.stream()
                .map(DtoMapper::toRouteSummaryResponse)
                .collect(Collectors.toList());
    }

    public static List<StopResponse> toStopList(List<Stop> stops) {
        return stops.stream()
                .map(DtoMapper::toStopResponse)
                .collect(Collectors.toList());
    }
}
