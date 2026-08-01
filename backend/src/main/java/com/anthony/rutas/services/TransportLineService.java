package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.TransportLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransportLineService {

    private final TransportLineRepository transportLineRepository;

    public List<TransportLineResponse> findAll() {
        return transportLineRepository.findAll().stream()
                .map(DtoMapper::toTransportLineResponse)
                .collect(Collectors.toList());
    }

    public List<TransportLineResponse> findByCity(UUID cityId) {
        return transportLineRepository.findByCityId(cityId).stream()
                .map(DtoMapper::toTransportLineResponse)
                .collect(Collectors.toList());
    }
}
