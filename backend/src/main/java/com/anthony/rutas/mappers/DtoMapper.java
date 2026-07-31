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
                .country(city.getCountry())
                .build();
    }

    public static TransportLineResponse toTransportLineResponse(TransportLine line) {
        return TransportLineResponse.builder()
                .id(line.getId())
                .name(line.getName())
                .number(line.getNumber())
                .color(line.getColor())
                .cityId(line.getCity().getId())
                .build();
    }

    public static RouteSummaryResponse toRouteSummaryResponse(Route route) {
        return RouteSummaryResponse.builder()
                .id(route.getId())
                .name(route.getName())
                .description(route.getDescription())
                .transportLineId(route.getTransportLine().getId())
                .transportLineName(route.getTransportLine().getName())
                .build();
    }

    public static RouteDetailResponse toRouteDetailResponse(Route route, List<RouteStop> routeStops, List<RoutePoint> routePoints) {
        List<StopResponse> stops = routeStops.stream()
                .map(rs -> toStopResponse(rs.getStop()))
                .collect(Collectors.toList());

        List<RoutePointResponse> points = routePoints.stream()
                .map(rp -> RoutePointResponse.builder()
                        .sequence(rp.getSequence())
                        .latitude(rp.getLocation().getY())
                        .longitude(rp.getLocation().getX())
                        .build())
                .collect(Collectors.toList());

        return RouteDetailResponse.builder()
                .id(route.getId())
                .name(route.getName())
                .description(route.getDescription())
                .transportLineId(route.getTransportLine().getId())
                .transportLineName(route.getTransportLine().getName())
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
