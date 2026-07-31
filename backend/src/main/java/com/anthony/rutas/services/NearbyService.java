package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NearbyService {

    private final StopRepository stopRepository;
    private final RouteStopRepository routeStopRepository;
    private final RouteRepository routeRepository;

    public List<RouteSummaryResponse> findNearbyRoutes(double latitude, double longitude, double radiusMeters) {
        List<Stop> nearbyStops = stopRepository.findNearby(latitude, longitude, radiusMeters);

        return nearbyStops.stream()
                .flatMap(stop -> routeStopRepository.findByStopId(stop.getId()).stream())
                .map(RouteStop::getRoute)
                .distinct()
                .map(DtoMapper::toRouteSummaryResponse)
                .collect(Collectors.toList());
    }

    public List<StopResponse> findNearbyStops(double latitude, double longitude, double radiusMeters) {
        List<Stop> nearbyStops = stopRepository.findNearby(latitude, longitude, radiusMeters);
        return DtoMapper.toStopList(nearbyStops);
    }
}
