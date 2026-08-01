package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;
    private final RouteDirectionRepository routeDirectionRepository;

    public List<RouteSummaryResponse> findAll() {
        return DtoMapper.toRouteSummaryList(routeRepository.findAll());
    }

    public RouteDetailResponse findById(UUID id) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + id));

        List<RouteDirection> directions = routeDirectionRepository.findByRouteId(id);

        return DtoMapper.toRouteDetailResponse(route, directions);
    }

    public List<RouteSummaryResponse> search(String query) {
        return DtoMapper.toRouteSummaryList(routeRepository.searchByQuery(query));
    }

    public List<RouteSummaryResponse> findByTransportLine(UUID transportLineId) {
        return DtoMapper.toRouteSummaryList(routeRepository.findByTransportLineId(transportLineId));
    }
}
