package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.StopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StopService {

    private final StopRepository stopRepository;

    public List<StopResponse> findAll() {
        return DtoMapper.toStopList(stopRepository.findAll());
    }

    public StopResponse findById(UUID id) {
        Stop stop = stopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found with id: " + id));
        return DtoMapper.toStopResponse(stop);
    }

    public List<StopResponse> search(String query) {
        return DtoMapper.toStopList(stopRepository.findByNameContainingIgnoreCase(query));
    }
}
