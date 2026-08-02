package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateStopRequest;
import com.anthony.rutas.dtos.request.UpdateStopRequest;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.StopRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StopService {

    private final StopRepository stopRepository;
    private final CityRepository cityRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory();

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

    @Transactional
    public StopResponse create(CreateStopRequest request) {
        City city = cityRepository.findById(UUID.fromString(request.getCityId()))
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + request.getCityId()));

        Point location = geometryFactory.createPoint(new Coordinate(request.getLongitude(), request.getLatitude()));

        Stop stop = Stop.builder()
                .city(city)
                .name(request.getName())
                .location(location)
                .reference(request.getReference())
                .address(request.getAddress())
                .isAccessible(request.getIsAccessible() != null ? request.getIsAccessible() : true)
                .build();

        return DtoMapper.toStopResponse(stopRepository.save(stop));
    }

    @Transactional
    public StopResponse update(UUID id, UpdateStopRequest request) {
        Stop stop = stopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found with id: " + id));

        if (request.getName() != null) stop.setName(request.getName());
        if (request.getLatitude() != null && request.getLongitude() != null) {
            Point location = geometryFactory.createPoint(new Coordinate(request.getLongitude(), request.getLatitude()));
            stop.setLocation(location);
        }
        if (request.getReference() != null) stop.setReference(request.getReference());
        if (request.getAddress() != null) stop.setAddress(request.getAddress());
        if (request.getIsAccessible() != null) stop.setAccessible(request.getIsAccessible());

        return DtoMapper.toStopResponse(stopRepository.save(stop));
    }

    @Transactional
    public void delete(UUID id) {
        if (!stopRepository.existsById(id)) {
            throw new ResourceNotFoundException("Stop not found with id: " + id);
        }
        stopRepository.deleteById(id);
    }
}
