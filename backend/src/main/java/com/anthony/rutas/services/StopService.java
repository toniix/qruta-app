package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.StopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StopService {

    private final StopRepository stopRepository;

    public List<StopResponse> findAll() {
        List<Stop> stops = stopRepository.findAll();
        return DtoMapper.toStopList(stops);
    }

    public StopResponse findById(Long id) {
        Stop stop = stopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found with id: " + id));
        return DtoMapper.toStopResponse(stop);
    }

    public List<StopResponse> search(String query) {
        List<Stop> stops = stopRepository.findByNameContainingIgnoreCase(query);
        return DtoMapper.toStopList(stops);
    }
}
