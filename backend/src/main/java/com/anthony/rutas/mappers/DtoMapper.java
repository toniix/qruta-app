package com.anthony.rutas.mappers;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public class DtoMapper {

        public static CityResponse toCityResponse(City city) {
                return CityResponse.builder()
                                .id(city.getId())
                                .name(city.getName())
                                .department(city.getDepartment())
                                .country(city.getCountry())
                                .latitude(city.getLatitude() != null ? city.getLatitude().doubleValue() : null)
                                .longitude(city.getLongitude() != null ? city.getLongitude().doubleValue() : null)
                                .radiusKm(city.getRadiusKm() != null ? city.getRadiusKm().doubleValue() : null)
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

        public static AdminRouteSummaryResponse toAdminRouteSummaryResponse(Route route) {
                TransportLine line = route.getTransportLine();
                return AdminRouteSummaryResponse.builder()
                                .id(route.getId())
                                .code(route.getCode())
                                .name(route.getName())
                                .color(route.getColor())
                                .fare(route.getFare())
                                .schedule(route.getSchedule())
                                .frequency(route.getFrequency())
                                .description(route.getDescription())
                                .status(route.getStatus())
                                .transportLineId(line != null ? line.getId() : null)
                                .transportLineName(line != null ? line.getName() : null)
                                .build();
        }

        public static List<AdminRouteSummaryResponse> toAdminRouteSummaryList(List<Route> routes) {
                return routes.stream()
                                .map(DtoMapper::toAdminRouteSummaryResponse)
                                .collect(Collectors.toList());
        }

        public static RouteSummaryResponse toRouteSummaryResponse(Route route, List<KeyStopResponse> keyStops) {
                return RouteSummaryResponse.builder()
                                .id(route.getId())
                                .code(route.getCode())
                                .name(route.getName())
                                .color(route.getColor())
                                .fare(route.getFare())
                                .transportLineName(route.getTransportLine() != null ? route.getTransportLine().getName() : null)
                                .cityId(route.getTransportLine() != null && route.getTransportLine().getCity() != null ? route.getTransportLine().getCity().getId() : null)
                                .cityName(route.getTransportLine() != null && route.getTransportLine().getCity() != null ? route.getTransportLine().getCity().getName() : null)
                                .keyStops(keyStops != null ? keyStops : List.of())
                                .build();
        }

        public static KeyStopResponse toKeyStopResponse(Stop stop) {
                if (stop == null)
                        return null;
                Double lat = stop.getLocation() != null ? stop.getLocation().getY() : null;
                Double lng = stop.getLocation() != null ? stop.getLocation().getX() : null;
                return KeyStopResponse.builder()
                                .id(stop.getId())
                                .name(stop.getName())
                                .latitude(lat)
                                .longitude(lng)
                                .build();
        }

        public static RouteDetailResponse toRouteDetailResponse(Route route, List<RouteDirection> directions) {
                List<RouteDirectionResponse> directionResponses = directions.stream()
                                .map(DtoMapper::toRouteDirectionResponse)
                                .collect(Collectors.toList());

                RouteDetailResponse.TransportLineInfo transportLine = RouteDetailResponse.TransportLineInfo.builder()
                                .id(route.getTransportLine().getId())
                                .name(route.getTransportLine().getName())
                                .build();

                RouteDetailResponse.ScheduleInfo schedule = RouteDetailResponse.ScheduleInfo.builder()
                                .hours(route.getSchedule())
                                .frequency(route.getFrequency())
                                .build();

                return RouteDetailResponse.builder()
                                .id(route.getId())
                                .code(route.getCode())
                                .name(route.getName())
                                .color(route.getColor())
                                .fare(route.getFare())
                                .transportLine(transportLine)
                                .description(route.getDescription())
                                .schedule(schedule)
                                .status(route.getStatus())
                                .directions(directionResponses)
                                .build();
        }

        public static RouteDirectionResponse toRouteDirectionResponse(RouteDirection direction) {
                List<DirectionStopResponse> stops = direction.getRouteStops().stream()
                                .map(DtoMapper::toDirectionStopResponse)
                                .collect(Collectors.toList());

                List<List<Double>> points = direction.getRoutePoints().stream()
                                .map(rp -> List.of(rp.getLocation().getY(), rp.getLocation().getX()))
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

        public static DirectionStopResponse toDirectionStopResponse(RouteStop routeStop) {
                Stop stop = routeStop.getStop();
                if (stop == null) {
                        return null;
                }

                DirectionStopResponse.Coordinates coordinates = DirectionStopResponse.Coordinates.builder()
                                .latitude(stop.getLocation() != null ? stop.getLocation().getY() : null)
                                .longitude(stop.getLocation() != null ? stop.getLocation().getX() : null)
                                .build();

                return DirectionStopResponse.builder()
                                .id(stop.getId())
                                .name(stop.getName())
                                .location(coordinates)
                                .reference(stop.getReference())
                                .address(stop.getAddress())
                                .accessible(stop.isAccessible())
                                .stopOrder(routeStop.getStopOrder())
                                .distanceFromStart(routeStop.getDistanceFromStart())
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
                                .cityId(stop.getCity() != null ? stop.getCity().getId() : null)
                                .cityName(stop.getCity() != null ? stop.getCity().getName() : null)
                                .build();
        }

        public static PopularRouteResponse toPopularRouteResponse(Route route) {
                long totalStops = route.getDirections().stream()
                                .flatMap(dir -> dir.getRouteStops().stream())
                                .map(rs -> rs.getStop() != null ? rs.getStop().getId() : null)
                                .filter(Objects::nonNull)
                                .distinct()
                                .count();

                return toPopularRouteResponse(route, (int) totalStops);
        }

        public static PopularRouteResponse toPopularRouteResponse(Route route, int totalStops) {
                return PopularRouteResponse.builder()
                                .id(route.getId())
                                .code(route.getCode())
                                .name(route.getName())
                                .color(route.getColor())
                                .totalStops(totalStops)
                                .popularityScore(route.getPopularityScore())
                                .cityId(route.getTransportLine() != null && route.getTransportLine().getCity() != null ? route.getTransportLine().getCity().getId() : null)
                                .cityName(route.getTransportLine() != null && route.getTransportLine().getCity() != null ? route.getTransportLine().getCity().getName() : null)
                                .build();
        }

        public static List<KeyStopResponse> toKeyStopList(List<Stop> stops) {
                return stops.stream()
                                .filter(stop -> stop != null && Boolean.TRUE.equals(stop.getKeyStop()))
                                .map(DtoMapper::toKeyStopResponse)
                                .collect(Collectors.toList());
        }

        public static List<StopResponse> toStopList(List<Stop> stops) {
                return stops.stream()
                                .map(DtoMapper::toStopResponse)
                                .collect(Collectors.toList());
        }

        public static StopRouteResponse toStopRouteResponse(Route route, List<String> directions, String directionLabel) {
                return StopRouteResponse.builder()
                                .id(route.getId())
                                .code(route.getCode())
                                .name(route.getName())
                                .color(route.getColor())
                                .directions(directions)
                                .directionLabel(directionLabel)
                                .build();
        }
}
