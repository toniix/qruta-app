package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;
    private final RouteStopRepository routeStopRepository;
    private final RoutePointRepository routePointRepository;

    public List<RouteSummaryResponse> findAll() {
        List<Route> routes = routeRepository.findAll();
        return DtoMapper.toRouteSummaryList(routes);
    }

    public RouteDetailResponse findById(Long id) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + id));

        List<RouteStop> routeStops = routeStopRepository.findByRouteIdOrderBySequenceAsc(id);
        List<RoutePoint> routePoints = routePointRepository.findByRouteIdOrderBySequenceAsc(id);

        return DtoMapper.toRouteDetailResponse(route, routeStops, routePoints);
    }

    public List<RouteSummaryResponse> search(String query) {
        List<Route> routes = routeRepository.searchByQuery(query);
        return DtoMapper.toRouteSummaryList(routes);
    }

    public List<RouteSummaryResponse> findByTransportLine(Long transportLineId) {
        List<Route> routes = routeRepository.findByTransportLineId(transportLineId);
        return DtoMapper.toRouteSummaryList(routes);
    }
}
