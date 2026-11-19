package com.anthony.rutas.services;

import com.anthony.rutas.billing.BillingService;
import com.anthony.rutas.billing.SubscriptionAccessService;
import com.anthony.rutas.dtos.request.CreateDisruptionRequest;
import com.anthony.rutas.dtos.request.UpdateDisruptionRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorLineRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorRouteRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.dtos.request.UpdateStopRequest;
import com.anthony.rutas.dtos.response.ChangeLogResponse;
import com.anthony.rutas.dtos.response.DisruptionResponse;
import com.anthony.rutas.dtos.response.OperatorAnalyticsSummaryResponse;
import com.anthony.rutas.dtos.response.OperatorLineResponse;
import com.anthony.rutas.dtos.response.OperatorProfileResponse;
import com.anthony.rutas.dtos.response.OperatorRouteResponse;
import com.anthony.rutas.dtos.response.OperatorStopResponse;
import com.anthony.rutas.dtos.response.RouteAnalyticsSeriesResponse;
import com.anthony.rutas.dtos.response.RouteDetailResponse;
import com.anthony.rutas.dtos.response.SubscriptionResponse;
import com.anthony.rutas.entities.Disruption;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.RouteDailyStat;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.entities.TransportLine;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.mappers.OperatorDtoMapper;
import com.anthony.rutas.repositories.DisruptionRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.RouteDailyStatRepository;
import com.anthony.rutas.repositories.RouteEventRepository;
import com.anthony.rutas.repositories.RouteRepository;
import com.anthony.rutas.repositories.StopRepository;
import com.anthony.rutas.repositories.TransportLineRepository;
import com.anthony.rutas.security.OperatorPrincipal;
import com.anthony.rutas.security.OperatorScope;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/**
 * Read and write operations exposed to the operator portal. Every query that
 * returns tenant data receives the operator id from {@link OperatorScope}, and
 * every mutation writes an audit entry through {@link ChangeLogService}.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OperatorPortalService {

    private static final Set<String> DISRUPTION_TYPES =
            Set.of("DESVIO", "CORTE", "HORARIO", "PARADERO", "OTRO");
    private static final String UNATTRIBUTED_CAMPAIGN = "UNATTRIBUTED";

    private final OperatorScope operatorScope;
    private final SubscriptionAccessService subscriptionAccessService;
    private final BillingService billingService;
    private final ChangeLogService changeLogService;
    private final OperatorRepository operatorRepository;
    private final TransportLineRepository transportLineRepository;
    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final DisruptionRepository disruptionRepository;
    private final RouteService routeService;
    private final RouteDailyStatRepository routeDailyStatRepository;
    private final RouteEventRepository routeEventRepository;
    private final RouteAnalyticsService routeAnalyticsService;
    private final GeometryFactory geometryFactory;

    public OperatorProfileResponse getProfile() {
        UUID operatorId = operatorScope.requireOperatorId();
        OperatorPrincipal principal = operatorScope.requirePrincipal();
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found: " + operatorId));
        return OperatorProfileResponse.builder()
                .operatorId(operator.getId())
                .operatorName(operator.getName())
                .plan(operator.getPlan())
                .cityName(operator.getCity() != null ? operator.getCity().getName() : null)
                .email(principal.getUsername())
                .fullName(principal.getFullName())
                .role(principal.getOperatorRole())
                .build();
    }

    public SubscriptionResponse getSubscription() {
        return billingService.getSubscription();
    }

    public List<OperatorLineResponse> getLines() {
        UUID operatorId = operatorScope.requireOperatorId();
        return transportLineRepository.findByOperatorId(operatorId).stream()
                .map(line -> OperatorDtoMapper.toLineResponse(line, routeRepository
                        .findByTransportLineIdWithLine(line.getId()).size()))
                .toList();
    }

    @Transactional
    public OperatorLineResponse updateLine(UUID id, UpdateOperatorLineRequest request) {
        subscriptionAccessService.requireWriteAccess();
        UUID operatorId = operatorScope.requireOperatorId();
        TransportLine line = transportLineRepository.findByIdAndOperatorId(id, operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Transport line not found: " + id));

        updateField("TRANSPORT_LINE", id, "name", line.getName(), request.getName(), line::setName);
        updateField("TRANSPORT_LINE", id, "code", line.getCode(), request.getCode(), line::setCode);
        updateField("TRANSPORT_LINE", id, "color", line.getColor(), request.getColor(), line::setColor);
        updateField("TRANSPORT_LINE", id, "company", line.getCompany(), request.getCompany(), line::setCompany);
        updateField("TRANSPORT_LINE", id, "contact", line.getContact(), request.getContact(), line::setContact);
        updateField("TRANSPORT_LINE", id, "description", line.getDescription(), request.getDescription(), line::setDescription);
        updateField("TRANSPORT_LINE", id, "status", line.getStatus(), request.getStatus(), line::setStatus);

        TransportLine saved = transportLineRepository.save(line);
        return OperatorDtoMapper.toLineResponse(saved,
                routeRepository.findByTransportLineIdWithLine(saved.getId()).size());
    }

    public List<OperatorRouteResponse> getRoutes() {
        return OperatorDtoMapper.toRouteResponses(
                routeRepository.findByOperatorId(operatorScope.requireOperatorId()));
    }

    public RouteDetailResponse getRouteById(UUID id) {
        UUID operatorId = operatorScope.requireOperatorId();
        routeRepository.findByIdAndOperatorId(id, operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + id));
        return routeService.findById(id);
    }

    public OperatorAnalyticsSummaryResponse getAnalyticsSummary(LocalDate from, LocalDate to) {
        subscriptionAccessService.requireAnalyticsAccess();
        LocalDate effectiveTo = to != null ? to : LocalDate.now(ZoneOffset.UTC);
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(29);
        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new BadRequestException("from must be before to");
        }

        UUID operatorId = operatorScope.requireOperatorId();
        List<TransportLine> lines = transportLineRepository.findByOperatorId(operatorId);
        Set<UUID> lineIds = lines.stream().map(TransportLine::getId).collect(Collectors.toSet());
        if (lineIds.isEmpty()) {
            return new OperatorAnalyticsSummaryResponse(List.of(), List.of(), List.of(), List.of());
        }

        Map<UUID, UsageTotals> lineTotals = new LinkedHashMap<>();
        for (TransportLine line : lines) {
            lineTotals.put(line.getId(), new UsageTotals());
        }
        Map<LocalDate, UsageTotals> dayTotals = new LinkedHashMap<>();
        Map<UUID, UsageTotals> routeTotals = new LinkedHashMap<>();

        List<RouteDailyStat> stats = routeDailyStatRepository
                .findByTransportLineIdInAndDateBetweenOrderByDateAsc(lineIds, effectiveFrom, effectiveTo);
        for (RouteDailyStat stat : stats) {
            if (!lineIds.contains(stat.getTransportLineId())) {
                continue;
            }
            lineTotals.get(stat.getTransportLineId()).add(stat);
            dayTotals.computeIfAbsent(stat.getDate(), ignored -> new UsageTotals()).add(stat);
            routeTotals.computeIfAbsent(stat.getRouteId(), ignored -> new UsageTotals()).add(stat);
        }

        Map<UUID, Route> routesById = new LinkedHashMap<>();
        for (Route route : routeRepository.findByOperatorId(operatorId)) {
            routesById.put(route.getId(), route);
        }

        List<OperatorAnalyticsSummaryResponse.LineUsage> lineUsage = new ArrayList<>();
        for (TransportLine line : lines) {
            UsageTotals totals = lineTotals.get(line.getId());
            lineUsage.add(totals.toLineUsage(line.getId(), line.getName()));
        }

        List<OperatorAnalyticsSummaryResponse.DailyUsage> dailyUsage = dayTotals.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> entry.getValue().toDailyUsage(entry.getKey()))
                .toList();

        List<OperatorAnalyticsSummaryResponse.RouteRanking> routeRanking = routeTotals.entrySet().stream()
                .map(entry -> {
                    Route route = routesById.get(entry.getKey());
                    UsageTotals totals = entry.getValue();
                    return new OperatorAnalyticsSummaryResponse.RouteRanking(
                            entry.getKey(),
                            route != null ? route.getName() : entry.getKey().toString(),
                            route != null ? route.getCode() : null,
                            totals.views,
                            totals.searches,
                            totals.qrScans,
                            totals.views + totals.searches);
                })
                .sorted(Comparator.comparingLong(OperatorAnalyticsSummaryResponse.RouteRanking::interactions)
                        .reversed()
                        .thenComparing(OperatorAnalyticsSummaryResponse.RouteRanking::routeName,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        List<OperatorAnalyticsSummaryResponse.QrCampaignUsage> qrCampaigns = routeEventRepository
                .countQrScansByCampaign(
                        EventCategory.QR_SCAN,
                        effectiveFrom.atStartOfDay(ZoneOffset.UTC).toInstant(),
                        effectiveTo.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant(),
                        lineIds)
                .stream()
                .map(row -> new OperatorAnalyticsSummaryResponse.QrCampaignUsage(
                        campaignLabel(row.getCampaign()),
                        row.getScans() == null ? 0L : row.getScans()))
                .toList();

        return new OperatorAnalyticsSummaryResponse(lineUsage, dailyUsage, routeRanking, qrCampaigns);
    }

    public RouteAnalyticsSeriesResponse getRouteAnalytics(UUID routeId, LocalDate from, LocalDate to) {
        subscriptionAccessService.requireAnalyticsAccess();
        UUID operatorId = operatorScope.requireOperatorId();
        routeRepository.findByIdAndOperatorId(routeId, operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + routeId));

        LocalDate effectiveTo = to != null ? to : LocalDate.now(ZoneOffset.UTC);
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(29);
        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new BadRequestException("from must be before to");
        }
        return routeAnalyticsService.routeSeries(routeId, effectiveFrom, effectiveTo);
    }

    @Transactional
    public OperatorRouteResponse updateRoute(UUID id, UpdateOperatorRouteRequest request) {
        subscriptionAccessService.requireWriteAccess();
        UUID operatorId = operatorScope.requireOperatorId();
        Route route = routeRepository.findByIdAndOperatorId(id, operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + id));

        updateField("ROUTE", id, "name", route.getName(), request.getName(), route::setName);
        updateField("ROUTE", id, "code", route.getCode(), request.getCode(), route::setCode);
        updateField("ROUTE", id, "category", route.getCategory(), request.getCategory(), route::setCategory);
        updateField("ROUTE", id, "color", route.getColor(), request.getColor(), route::setColor);
        updateField("ROUTE", id, "description", route.getDescription(), request.getDescription(), route::setDescription);
        updateField("ROUTE", id, "status", route.getStatus(), request.getStatus(), route::setStatus);

        return OperatorDtoMapper.toRouteResponse(routeRepository.save(route));
    }

    @Transactional
    public RouteDetailResponse updateRouteDirections(UUID id, UpdateRouteDirectionsRequest request) {
        subscriptionAccessService.requireWriteAccess();
        UUID operatorId = operatorScope.requireOperatorId();
        Route route = routeRepository.findByIdAndOperatorId(id, operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + id));
        UUID cityId = requireOperatorCityId(operatorId);

        for (UpdateRouteDirectionsRequest.DirectionUpdateRequest direction : request.getDirections()) {
            if (direction == null || direction.getStops() == null) {
                continue;
            }
            for (UpdateRouteDirectionsRequest.StopUpdateRequest stop : direction.getStops()) {
                if (stop == null || stop.getStopId() == null) {
                    continue;
                }
                UUID stopId = parseUuid(stop.getStopId(), "Stop");
                stopRepository.findByIdAndCityId(stopId, cityId)
                        .orElseThrow(() -> new ResourceNotFoundException("Stop not found: " + stopId));
            }
        }

        int previousCount = route.getDirections() != null ? route.getDirections().size() : 0;
        RouteDetailResponse response = routeService.updateDirections(id, request);
        changeLogService.record("ROUTE", id, "directions", previousCount, request.getDirections().size());
        return response;
    }

    public List<OperatorStopResponse> getStops() {
        UUID operatorId = operatorScope.requireOperatorId();
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found: " + operatorId));
        UUID cityId = operator.getCity() != null ? operator.getCity().getId() : null;
        if (cityId == null) {
            return List.of();
        }
        List<Stop> stops = stopRepository.findByCityId(cityId);
        return OperatorDtoMapper.toStopResponses(stops);
    }

    @Transactional
    public OperatorStopResponse updateStop(UUID id, UpdateStopRequest request) {
        subscriptionAccessService.requireWriteAccess();
        UUID operatorId = operatorScope.requireOperatorId();
        UUID cityId = requireOperatorCityId(operatorId);
        Stop stop = stopRepository.findByIdAndCityId(id, cityId)
                .orElseThrow(() -> new ResourceNotFoundException("Stop not found: " + id));

        String previousLocation = stop.getLocation() != null
                ? stop.getLocation().getY() + "," + stop.getLocation().getX()
                : null;

        updateField("STOP", id, "name", stop.getName(), request.getName(), stop::setName);
        updateField("STOP", id, "address", stop.getAddress(), request.getAddress(), stop::setAddress);
        updateField("STOP", id, "reference", stop.getReference(), request.getReference(), stop::setReference);

        Boolean accessible = request.getIsAccessible();
        if (accessible != null && accessible != stop.isAccessible()) {
            changeLogService.record("STOP", id, "accessible", stop.isAccessible(), accessible);
            stop.setAccessible(accessible);
        }

        if (request.getLatitude() != null && request.getLongitude() != null) {
            String nextLocation = request.getLatitude() + "," + request.getLongitude();
            if (!Objects.equals(previousLocation, nextLocation)) {
                changeLogService.record("STOP", id, "location", previousLocation, nextLocation);
                stop.setLocation(geometryFactory.createPoint(
                        new Coordinate(request.getLongitude(), request.getLatitude())));
            }
        }

        return OperatorDtoMapper.toStopResponse(stopRepository.save(stop));
    }

    public List<DisruptionResponse> getDisruptions() {
        return OperatorDtoMapper.toDisruptionResponses(
                disruptionRepository.findByOperatorId(operatorScope.requireOperatorId()));
    }

    @Transactional
    public DisruptionResponse createDisruption(CreateDisruptionRequest request) {
        subscriptionAccessService.requireWriteAccess();
        UUID operatorId = operatorScope.requireOperatorId();
        validateType(request.getType());
        validatePeriod(request.getStartsAt(), request.getEndsAt());

        UUID routeId = parseRouteId(request.getRouteId());
        Route route = routeRepository.findByIdAndOperatorId(routeId, operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + routeId));
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found: " + operatorId));

        Disruption disruption = Disruption.builder()
                .operator(operator)
                .route(route)
                .type(request.getType())
                .description(request.getDescription())
                .startsAt(request.getStartsAt())
                .endsAt(request.getEndsAt())
                .active(request.getActive() == null || request.getActive())
                .build();

        Disruption saved = disruptionRepository.save(disruption);
        changeLogService.record("DISRUPTION", saved.getId(), "created", null, saved.getType());
        return OperatorDtoMapper.toDisruptionResponse(saved);
    }

    @Transactional
    public DisruptionResponse updateDisruption(UUID id, UpdateDisruptionRequest request) {
        subscriptionAccessService.requireWriteAccess();
        UUID operatorId = operatorScope.requireOperatorId();
        Disruption disruption = disruptionRepository.findByIdAndOperatorId(id, operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Disruption not found: " + id));

        if (request.getType() != null) {
            validateType(request.getType());
        }
        LocalDateTime startsAt = request.getStartsAt() != null ? request.getStartsAt() : disruption.getStartsAt();
        LocalDateTime endsAt = request.getEndsAt() != null ? request.getEndsAt() : disruption.getEndsAt();
        validatePeriod(startsAt, endsAt);

        updateField("DISRUPTION", id, "type", disruption.getType(), request.getType(), disruption::setType);
        updateField("DISRUPTION", id, "description", disruption.getDescription(), request.getDescription(),
                disruption::setDescription);
        if (request.getStartsAt() != null && !Objects.equals(disruption.getStartsAt(), request.getStartsAt())) {
            changeLogService.record("DISRUPTION", id, "startsAt", disruption.getStartsAt(), request.getStartsAt());
            disruption.setStartsAt(request.getStartsAt());
        }
        if (request.getEndsAt() != null && !Objects.equals(disruption.getEndsAt(), request.getEndsAt())) {
            changeLogService.record("DISRUPTION", id, "endsAt", disruption.getEndsAt(), request.getEndsAt());
            disruption.setEndsAt(request.getEndsAt());
        }
        if (request.getActive() != null && request.getActive() != disruption.isActive()) {
            changeLogService.record("DISRUPTION", id, "active", disruption.isActive(), request.getActive());
            disruption.setActive(request.getActive());
        }

        return OperatorDtoMapper.toDisruptionResponse(disruptionRepository.save(disruption));
    }

    @Transactional
    public void deleteDisruption(UUID id) {
        subscriptionAccessService.requireWriteAccess();
        UUID operatorId = operatorScope.requireOperatorId();
        Disruption disruption = disruptionRepository.findByIdAndOperatorId(id, operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Disruption not found: " + id));
        changeLogService.record("DISRUPTION", id, "deleted", disruption.getType(), null);
        disruptionRepository.delete(disruption);
    }

    public List<ChangeLogResponse> getChangeLogs() {
        return OperatorDtoMapper.toChangeLogResponses(
                changeLogService.listForOperator(operatorScope.requireOperatorId()));
    }

    private void updateField(String entityType, UUID entityId, String field, String current, String next,
            Consumer<String> setter) {
        if (next != null && !Objects.equals(current, next)) {
            changeLogService.record(entityType, entityId, field, current, next);
            setter.accept(next);
        }
    }

    private void validateType(String type) {
        if (!DISRUPTION_TYPES.contains(type)) {
            throw new BadRequestException("Invalid disruption type: " + type);
        }
    }

    private void validatePeriod(LocalDateTime startsAt, LocalDateTime endsAt) {
        if (endsAt != null && endsAt.isBefore(startsAt)) {
            throw new BadRequestException("endsAt must be after startsAt");
        }
    }

    private UUID parseRouteId(String routeId) {
        return parseUuid(routeId, "Route");
    }

    private UUID parseUuid(String value, String entityName) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid " + entityName + " ID: " + value);
        }
    }

    private UUID requireOperatorCityId(UUID operatorId) {
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found: " + operatorId));
        if (operator.getCity() == null) {
            throw new BadRequestException("Operator city is required");
        }
        return operator.getCity().getId();
    }

    private String campaignLabel(String campaign) {
        return campaign == null || campaign.isBlank() ? UNATTRIBUTED_CAMPAIGN : campaign;
    }

    private static final class UsageTotals {
        private long views;
        private long searches;
        private long qrScans;
        private long stopViews;
        private long nearbyQueries;
        private long communityPosts;
        private long uniqueDevices;

        private void add(RouteDailyStat stat) {
            views += stat.getViews();
            searches += stat.getSearches();
            qrScans += stat.getQrScans();
            stopViews += stat.getStopViews();
            nearbyQueries += stat.getNearbyQueries();
            communityPosts += stat.getCommunityPosts();
            uniqueDevices += stat.getUniqueDevices();
        }

        private OperatorAnalyticsSummaryResponse.LineUsage toLineUsage(UUID lineId, String lineName) {
            return new OperatorAnalyticsSummaryResponse.LineUsage(
                    lineId, lineName, views, searches, qrScans, stopViews, nearbyQueries, communityPosts,
                    uniqueDevices);
        }

        private OperatorAnalyticsSummaryResponse.DailyUsage toDailyUsage(LocalDate date) {
            return new OperatorAnalyticsSummaryResponse.DailyUsage(
                    date, views, searches, qrScans, stopViews, nearbyQueries, communityPosts, uniqueDevices);
        }
    }
}
