package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateCityRequest;
import com.anthony.rutas.dtos.response.CityResponse;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.exceptions.ConflictException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.CommunityPostRepository;
import com.anthony.rutas.repositories.DisruptionRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CityService {

    private final CityRepository cityRepository;
    private final OperatorRepository operatorRepository;
    private final CommunityPostRepository communityPostRepository;
    private final DisruptionRepository disruptionRepository;
    private final RouteStopRepository routeStopRepository;

    @Transactional(readOnly = true)
    public List<CityResponse> findAll() {
        return cityRepository.findAll().stream()
                .map(DtoMapper::toCityResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CityResponse create(CreateCityRequest request) {
        City city = City.builder()
                .name(request.getName())
                .department(request.getDepartment())
                .country(request.getCountry())
                .latitude(request.getLatitude() != null ? java.math.BigDecimal.valueOf(request.getLatitude()) : null)
                .longitude(request.getLongitude() != null ? java.math.BigDecimal.valueOf(request.getLongitude()) : null)
                .radiusKm(request.getRadiusKm() != null ? java.math.BigDecimal.valueOf(request.getRadiusKm()) : java.math.BigDecimal.valueOf(30.0))
                .build();
        return DtoMapper.toCityResponse(cityRepository.save(city));
    }

    @Transactional
    public CityResponse update(UUID id, CreateCityRequest request) {
        City city = cityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + id));

        if (request.getName() != null) city.setName(request.getName());
        if (request.getDepartment() != null) city.setDepartment(request.getDepartment());
        if (request.getCountry() != null) city.setCountry(request.getCountry());
        if (request.getLatitude() != null) city.setLatitude(java.math.BigDecimal.valueOf(request.getLatitude()));
        if (request.getLongitude() != null) city.setLongitude(java.math.BigDecimal.valueOf(request.getLongitude()));
        if (request.getRadiusKm() != null) city.setRadiusKm(java.math.BigDecimal.valueOf(request.getRadiusKm()));

        return DtoMapper.toCityResponse(cityRepository.save(city));
    }

    @Transactional
    public void delete(UUID id) {
        if (!cityRepository.existsById(id)) {
            throw new ResourceNotFoundException("City not found with id: " + id);
        }

        long operatorCount = operatorRepository.countByCityId(id);
        if (operatorCount > 0) {
            throw new ConflictException(
                    "Cannot delete city: " + operatorCount
                            + (operatorCount == 1 ? " operator belongs" : " operators belong")
                            + " to this city.");
        }

        communityPostRepository.detachCity(id);
        communityPostRepository.detachRoutesByCityId(id);
        disruptionRepository.deleteByRouteTransportLineCityId(id);
        routeStopRepository.deleteByStopCityId(id);
        cityRepository.deleteById(id);
    }
}
