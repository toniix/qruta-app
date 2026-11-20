package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateTransportLineRequest;
import com.anthony.rutas.dtos.request.UpdateTransportLineRequest;
import com.anthony.rutas.dtos.response.*;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.TransportLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransportLineService {

    private final TransportLineRepository transportLineRepository;
    private final CityRepository cityRepository;
    private final OperatorRepository operatorRepository;

    @Transactional(readOnly = true)
    public List<TransportLineResponse> findAll() {
        return transportLineRepository.findAllWithCity().stream()
                .map(DtoMapper::toTransportLineResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TransportLineResponse> findByCity(UUID cityId) {
        return transportLineRepository.findByCityIdWithCity(cityId).stream()
                .map(DtoMapper::toTransportLineResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TransportLineResponse create(CreateTransportLineRequest request) {
        City city = cityRepository.findById(UUID.fromString(request.getCityId()))
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + request.getCityId()));

        Operator operator = resolveOperatorForAssignment(request.getOperatorId(), null, null);

        TransportLine line = TransportLine.builder()
                .city(city)
                .operator(operator)
                .name(request.getName())
                .code(request.getCode())
                .color(request.getColor())
                .company(request.getCompany())
                .contact(request.getContact())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .build();

        return DtoMapper.toTransportLineResponse(transportLineRepository.save(line));
    }

    @Transactional
    public TransportLineResponse update(UUID id, UpdateTransportLineRequest request) {
        TransportLine line = transportLineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transport line not found with id: " + id));

        if (request.getName() != null) line.setName(request.getName());
        if (request.getCode() != null) line.setCode(request.getCode());
        if (request.getColor() != null) line.setColor(request.getColor());
        if (request.getCompany() != null) line.setCompany(request.getCompany());
        if (request.getContact() != null) line.setContact(request.getContact());
        if (request.getDescription() != null) line.setDescription(request.getDescription());
        if (request.getStatus() != null) line.setStatus(request.getStatus());

        UUID currentOperatorId = line.getOperator() != null ? line.getOperator().getId() : null;
        Operator currentOperator = line.getOperator();
        line.setOperator(resolveOperatorForAssignment(request.getOperatorId(), currentOperator, currentOperatorId));

        return DtoMapper.toTransportLineResponse(transportLineRepository.save(line));
    }

    /**
     * Resolves the operator assignment for a line request.
     *
     * A blank value clears the assignment. A non-blank value must reference an
     * existing active operator, except when it is the operator the line already
     * belongs to (so editing other fields does not fail just because that
     * operator was later deactivated).
     */
    private Operator resolveOperatorForAssignment(String operatorId, Operator currentOperator, UUID currentOperatorId) {
        if (!StringUtils.hasText(operatorId)) {
            return null;
        }
        UUID targetId = UUID.fromString(operatorId.trim());
        if (currentOperatorId != null && targetId.equals(currentOperatorId)) {
            return currentOperator;
        }
        Operator operator = operatorRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found with id: " + operatorId));
        if (!operator.isActive()) {
            throw new BadRequestException("No se puede asignar un operador inactivo");
        }
        return operator;
    }

    @Transactional
    public void delete(UUID id) {
        if (!transportLineRepository.existsById(id)) {
            throw new ResourceNotFoundException("Transport line not found with id: " + id);
        }
        transportLineRepository.deleteById(id);
    }
}
