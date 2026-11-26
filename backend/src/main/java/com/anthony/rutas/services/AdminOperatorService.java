package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateOperatorRequest;
import com.anthony.rutas.dtos.request.CreateOperatorUserRequest;
import com.anthony.rutas.dtos.request.ResetPasswordRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorUserRequest;
import com.anthony.rutas.dtos.response.OperatorResponse;
import com.anthony.rutas.dtos.response.OperatorUserResponse;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.OperatorUser;
import com.anthony.rutas.entities.TransportLine;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.DtoMapper;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.OperatorUserRepository;
import com.anthony.rutas.repositories.TransportLineRepository;
import com.anthony.rutas.utils.UuidUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Platform-admin management of transport operators and their portal users.
 *
 * Deactivation is soft: operator and user rows are never deleted because
 * subscriptions, lines, disruptions and change logs keep referencing them.
 */
@Service
@RequiredArgsConstructor
public class AdminOperatorService {

    private static final Set<String> PLANS = Set.of("BASIC", "PRO", "ENTERPRISE");
    private static final Set<String> USER_ROLES = Set.of("OWNER", "EDITOR");

    private final OperatorRepository operatorRepository;
    private final OperatorUserRepository operatorUserRepository;
    private final CityRepository cityRepository;
    private final TransportLineRepository transportLineRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Operators ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OperatorResponse> findAll() {
        return operatorRepository.findAllWithCity().stream()
                .map(DtoMapper::toOperatorResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OperatorResponse findById(UUID id) {
        return DtoMapper.toOperatorResponse(getOperatorOrThrow(id));
    }

    @Transactional
    public OperatorResponse create(CreateOperatorRequest request) {
        if (operatorRepository.existsByRucIgnoreCase(request.getRuc())) {
            throw new BadRequestException("Ya existe un operador con el RUC " + request.getRuc());
        }

        UUID lineId = UuidUtils.parseRequired(request.getTransportLineId(), "transport line ID");

        TransportLine line = transportLineRepository.findById(lineId)
                .orElseThrow(() -> new ResourceNotFoundException("Transport line not found with id: " + request.getTransportLineId()));

        if (line.getOperator() != null) {
            throw new BadRequestException("Transport line is already linked to an operator");
        }

        UUID cityId = UuidUtils.parseRequired(request.getCityId(), "city ID");
        City city = cityRepository.findById(cityId)
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + request.getCityId()));

        String plan = StringUtils.hasText(request.getPlan()) ? request.getPlan() : "PRO";
        if (!PLANS.contains(plan)) {
            throw new BadRequestException("Plan inválido: " + plan);
        }

        Operator operator = Operator.builder()
                .name(line.getCompany())
                .ruc(request.getRuc())
                .contactName(request.getContactName())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .city(city)
                .plan(plan)
                .active(true)
                .build();

        Operator savedOperator = operatorRepository.save(operator);
        line.setOperator(savedOperator);
        transportLineRepository.save(line);

        return DtoMapper.toOperatorResponse(savedOperator);
    }

    @Transactional
    public OperatorResponse update(UUID id, UpdateOperatorRequest request) {
        Operator operator = getOperatorOrThrow(id);

        if (StringUtils.hasText(request.getRuc()) && !request.getRuc().equals(operator.getRuc())) {
            if (operatorRepository.existsByRucIgnoreCaseAndIdNot(request.getRuc(), id)) {
                throw new BadRequestException("Ya existe un operador con el RUC " + request.getRuc());
            }
            operator.setRuc(request.getRuc());
        }
        if (request.getName() != null) operator.setName(request.getName());
        if (request.getContactName() != null) operator.setContactName(request.getContactName());
        if (request.getContactEmail() != null) operator.setContactEmail(request.getContactEmail());
        if (request.getContactPhone() != null) operator.setContactPhone(request.getContactPhone());

        String currentCityId = operator.getCity() != null && operator.getCity().getId() != null
                ? operator.getCity().getId().toString()
                : null;
        if (StringUtils.hasText(request.getCityId()) && !request.getCityId().trim().equals(currentCityId)) {
            UUID targetCityId = UuidUtils.parseRequired(request.getCityId(), "city ID");
            City city = cityRepository.findById(targetCityId)
                    .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + request.getCityId()));
            operator.setCity(city);
        }

        if (StringUtils.hasText(request.getPlan())) {
            if (!PLANS.contains(request.getPlan())) {
                throw new BadRequestException("Plan inválido: " + request.getPlan());
            }
            operator.setPlan(request.getPlan());
        }
        if (request.getActive() != null) operator.setActive(request.getActive());

        return DtoMapper.toOperatorResponse(operatorRepository.save(operator));
    }

    @Transactional
    public OperatorResponse setActive(UUID id, boolean active) {
        Operator operator = getOperatorOrThrow(id);
        operator.setActive(active);
        return DtoMapper.toOperatorResponse(operatorRepository.save(operator));
    }

    // ── Operator users ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OperatorUserResponse> findUsers(UUID operatorId) {
        getOperatorOrThrow(operatorId);
        return operatorUserRepository.findByOperatorId(operatorId).stream()
                .map(DtoMapper::toOperatorUserResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public OperatorUserResponse createUser(UUID operatorId, CreateOperatorUserRequest request) {
        Operator operator = getOperatorOrThrow(operatorId);

        if (operatorUserRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BadRequestException("Ya existe un usuario con el correo " + request.getEmail());
        }

        String role = StringUtils.hasText(request.getRole()) ? request.getRole() : "EDITOR";
        if (!USER_ROLES.contains(role)) {
            throw new BadRequestException("Rol inválido: " + role);
        }

        OperatorUser user = OperatorUser.builder()
                .operator(operator)
                .email(request.getEmail())
                .fullName(request.getFullName())
                .role(role)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .active(true)
                .build();

        return DtoMapper.toOperatorUserResponse(operatorUserRepository.save(user));
    }

    @Transactional
    public OperatorUserResponse updateUser(UUID operatorId, UUID userId, UpdateOperatorUserRequest request) {
        getOperatorOrThrow(operatorId);
        OperatorUser user = getOperatorUserForOperatorOrThrow(operatorId, userId);

        if (StringUtils.hasText(request.getEmail()) && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (operatorUserRepository.existsByEmailIgnoreCaseAndIdNot(request.getEmail(), userId)) {
                throw new BadRequestException("Ya existe un usuario con el correo " + request.getEmail());
            }
            user.setEmail(request.getEmail());
        }
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (StringUtils.hasText(request.getRole())) {
            if (!USER_ROLES.contains(request.getRole())) {
                throw new BadRequestException("Rol inválido: " + request.getRole());
            }
            user.setRole(request.getRole());
        }
        if (request.getActive() != null) user.setActive(request.getActive());

        return DtoMapper.toOperatorUserResponse(operatorUserRepository.save(user));
    }

    @Transactional
    public OperatorUserResponse resetPassword(UUID operatorId, UUID userId, ResetPasswordRequest request) {
        getOperatorOrThrow(operatorId);
        OperatorUser user = getOperatorUserForOperatorOrThrow(operatorId, userId);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        return DtoMapper.toOperatorUserResponse(operatorUserRepository.save(user));
    }

    @Transactional
    public OperatorUserResponse setUserActive(UUID operatorId, UUID userId, boolean active) {
        getOperatorOrThrow(operatorId);
        OperatorUser user = getOperatorUserForOperatorOrThrow(operatorId, userId);
        user.setActive(active);
        return DtoMapper.toOperatorUserResponse(operatorUserRepository.save(user));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Operator getOperatorOrThrow(UUID id) {
        return operatorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found with id: " + id));
    }

    private OperatorUser getOperatorUserForOperatorOrThrow(UUID operatorId, UUID userId) {
        OperatorUser user = operatorUserRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator user not found with id: " + userId));
        if (user.getOperator() == null || !operatorId.equals(user.getOperator().getId())) {
            throw new ResourceNotFoundException("Operator user not found with id: " + userId);
        }
        return user;
    }
}