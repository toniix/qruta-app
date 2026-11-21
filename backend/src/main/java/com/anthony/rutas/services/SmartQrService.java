package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateQrCodeRequest;
import com.anthony.rutas.dtos.request.UpdateQrCodeRequest;
import com.anthony.rutas.dtos.response.QrCodeResponse;
import com.anthony.rutas.dtos.response.QrCodeStatsResponse;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.QrCode;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.RouteEvent;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.QrCodeRepository;
import com.anthony.rutas.repositories.RouteEventRepository;
import com.anthony.rutas.repositories.RouteRepository;
import com.anthony.rutas.repositories.StopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SmartQrService {

    private static final String CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
    private static final int CODE_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();
    public static final ZoneId LIMA_ZONE = ZoneId.of("America/Lima");

    private final QrCodeRepository qrCodeRepository;
    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final OperatorRepository operatorRepository;
    private final RouteEventRepository routeEventRepository;
    private final DeviceHasher deviceHasher;

    @Value("${app.frontend.url:https://front.anthonywar.dev}")
    private String configuredFrontendUrl = "https://front.anthonywar.dev";

    @Value("${app.backend.url:https://back.anthonywar.dev}")
    private String configuredBackendUrl = "https://back.anthonywar.dev";

    public record ResolvedRedirect(String redirectUrl, boolean active) {}

    public String generateUniqueCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            }
            String candidate = sb.toString();
            if (!qrCodeRepository.existsByCode(candidate)) {
                return candidate;
            }
        }
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    @Transactional
    public ResolvedRedirect resolveAndTrack(String code, String clientIdentifier) {
        Instant now = Instant.now();
        Optional<QrCode> optQr = qrCodeRepository.findByCode(code);
        if (optQr.isEmpty()) {
            return recordFailedRedirect(code, null, null, null, "not_found", now, clientIdentifier);
        }

        QrCode qr = optQr.get();
        if (!"ACTIVE".equalsIgnoreCase(qr.getStatus())) {
            return recordFailedRedirect(code, qr.getId(), null, null, "inactive", now, clientIdentifier);
        }

        UUID routeId = null;
        UUID stopId = null;
        UUID transportLineId = null;
        UUID cityId = null;
        boolean targetMissing = false;

        if ("ROUTE".equalsIgnoreCase(qr.getTargetType())) {
            routeId = qr.getTargetId();
            Optional<Route> optRoute = qr.getTargetId() == null
                    ? Optional.empty()
                    : routeRepository.findById(qr.getTargetId());
            if (optRoute.isEmpty()) {
                targetMissing = true;
            } else {
                Route r = optRoute.get();
                if (r.getTransportLine() != null) {
                    transportLineId = r.getTransportLine().getId();
                    if (r.getTransportLine().getCity() != null) {
                        cityId = r.getTransportLine().getCity().getId();
                    }
                }
            }
        } else if ("STOP".equalsIgnoreCase(qr.getTargetType())) {
            stopId = qr.getTargetId();
            Optional<Stop> optStop = qr.getTargetId() == null
                    ? Optional.empty()
                    : stopRepository.findById(qr.getTargetId());
            if (optStop.isEmpty()) {
                targetMissing = true;
            } else if (optStop.get().getCity() != null) {
                cityId = optStop.get().getCity().getId();
            }
        }

        if (targetMissing) {
            return recordFailedRedirect(code, qr.getId(), routeId, stopId, "target_missing", now, clientIdentifier);
        }

        String deviceHash = deviceHasher.hash(clientIdentifier != null ? clientIdentifier : "anon", now);
        RouteEvent scanEvent = RouteEvent.builder()
                .recordedAt(now)
                .receivedAt(now)
                .category(EventCategory.QR_SCAN)
                .qrCodeId(qr.getId())
                .routeId(routeId)
                .stopId(stopId)
                .transportLineId(transportLineId)
                .cityId(cityId)
                .campaign(qr.getCampaignSource() != null ? qr.getCampaignSource() : qr.getCode())
                .deviceHash(deviceHash)
                .build();
        routeEventRepository.save(scanEvent);

        String destinationUrl = buildDestinationUrl(qr);
        return new ResolvedRedirect(destinationUrl, true);
    }

    private ResolvedRedirect recordFailedRedirect(
            String code,
            UUID qrCodeId,
            UUID routeId,
            UUID stopId,
            String error,
            Instant now,
            String clientIdentifier) {
        String deviceHash = deviceHasher.hash(clientIdentifier != null ? clientIdentifier : "anon", now);
        RouteEvent failedEvent = RouteEvent.builder()
                .recordedAt(now)
                .receivedAt(now)
                .category(EventCategory.QR_REDIRECT_FAILED)
                .qrCodeId(qrCodeId)
                .routeId(routeId)
                .stopId(stopId)
                .campaign(code)
                .deviceHash(deviceHash)
                .build();
        routeEventRepository.save(failedEvent);
        return new ResolvedRedirect(buildFallback(error), false);
    }

    private String buildFallback(String error) {
        String base = configuredFrontendUrl != null && !configuredFrontendUrl.isBlank()
                ? configuredFrontendUrl.trim().replaceAll("/+$", "")
                : "https://front.anthonywar.dev";
        return base + "/?qr_error=" + error;
    }

    public String buildDestinationUrl(QrCode qr) {
        StringBuilder sb = new StringBuilder();
        String base = configuredFrontendUrl != null && !configuredFrontendUrl.isBlank()
                ? configuredFrontendUrl.trim().replaceAll("/+$", "")
                : "https://front.anthonywar.dev";
        sb.append(base);
        if ("ROUTE".equalsIgnoreCase(qr.getTargetType()) && qr.getTargetId() != null) {
            String routeCode = routeRepository.findById(qr.getTargetId())
                    .map(Route::getCode)
                    .filter(c -> !c.isBlank())
                    .orElseGet(() -> qr.getTargetId().toString());
            sb.append("/mapa/ruta/").append(urlEncode(routeCode));
        } else if ("STOP".equalsIgnoreCase(qr.getTargetType()) && qr.getTargetId() != null) {
            String stopIdentifier = stopRepository.findById(qr.getTargetId())
                    .map(s -> s.getSlug() != null && !s.getSlug().isBlank() ? s.getSlug() : s.getId().toString())
                    .orElseGet(() -> qr.getTargetId().toString());
            sb.append("/mapa/paradero/").append(urlEncode(stopIdentifier));
        } else {
            sb.append("/");
        }

        List<String> params = new ArrayList<>();
        params.add("qr=" + qr.getCode());
        if (qr.getId() != null) {
            params.add("qrId=" + qr.getId());
        }
        if (qr.getCampaignSource() != null && !qr.getCampaignSource().isBlank()) {
            params.add("utm_source=" + urlEncode(qr.getCampaignSource()));
        }
        if (qr.getCampaignMedium() != null && !qr.getCampaignMedium().isBlank()) {
            params.add("utm_medium=" + urlEncode(qr.getCampaignMedium()));
        }
        if (qr.getCampaignName() != null && !qr.getCampaignName().isBlank()) {
            params.add("utm_campaign=" + urlEncode(qr.getCampaignName()));
        }

        String separator = sb.toString().contains("?") ? "&" : "?";
        sb.append(separator).append(String.join("&", params));
        return sb.toString();
    }

    public String getCanonicalUrl(String code) {
        String base = configuredBackendUrl != null && !configuredBackendUrl.isBlank()
                ? configuredBackendUrl.trim().replaceAll("/+$", "")
                : "https://back.anthonywar.dev";
        return base + "/q/" + code;
    }

    public String resolveTargetTitle(QrCode qr) {
        if ("ROUTE".equalsIgnoreCase(qr.getTargetType()) && qr.getTargetId() != null) {
            return routeRepository.findById(qr.getTargetId())
                    .map(r -> r.getCode() + " - " + r.getName())
                    .orElse("Ruta (" + qr.getTargetId() + ")");
        } else if ("STOP".equalsIgnoreCase(qr.getTargetType()) && qr.getTargetId() != null) {
            return stopRepository.findById(qr.getTargetId())
                    .map(Stop::getName)
                    .orElse("Paradero (" + qr.getTargetId() + ")");
        } else if ("CAMPAIGN".equalsIgnoreCase(qr.getTargetType())) {
            return qr.getCampaignName() != null ? qr.getCampaignName() : "Campaña";
        }
        return "Inicio QRuta";
    }

    @Transactional(readOnly = true)
    public List<QrCodeResponse> listAll() {
        List<QrCode> codes = qrCodeRepository.findAllByOrderByCreatedAtDesc();
        Map<UUID, Long> scanCounts = fetchScanCountsMap();
        return codes.stream().map(qr -> toResponse(qr, scanCounts)).toList();
    }

    @Transactional(readOnly = true)
    public List<QrCodeResponse> listForOperator(UUID operatorId) {
        List<QrCode> codes = qrCodeRepository.findByOperatorIdOrderByCreatedAtDesc(operatorId);
        Map<UUID, Long> scanCounts = fetchScanCountsMap();
        return codes.stream().map(qr -> toResponse(qr, scanCounts)).toList();
    }

    @Transactional(readOnly = true)
    public QrCodeResponse getById(UUID id) {
        QrCode qr = qrCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QR Code not found: " + id));
        return toResponse(qr, null);
    }

    @Transactional(readOnly = true)
    public QrCodeResponse getByIdForOperator(UUID id, UUID operatorId) {
        QrCode qr = qrCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QR Code not found: " + id));
        if (qr.getOperatorId() == null || !operatorId.equals(qr.getOperatorId())) {
            throw new AccessDeniedException("Resource is outside the operator scope");
        }
        return toResponse(qr, null);
    }

    @Transactional
    public QrCodeResponse createForAdmin(CreateQrCodeRequest request) {
        validateTargetResource(request.getTargetType(), request.getTargetId());
        String code = generateUniqueCode();
        QrCode qr = QrCode.builder()
                .code(code)
                .label(request.getLabel().trim())
                .targetType(request.getTargetType().toUpperCase())
                .targetId(request.getTargetId())
                .campaignSource(trimToNull(request.getCampaignSource()))
                .campaignMedium(trimToNull(request.getCampaignMedium()))
                .campaignName(trimToNull(request.getCampaignName()))
                .operatorId(request.getOperatorId())
                .status("ACTIVE")
                .build();
        QrCode saved = qrCodeRepository.save(qr);
        return toResponse(saved, null);
    }

    @Transactional
    public QrCodeResponse createForOperator(UUID operatorId, CreateQrCodeRequest request) {
        validateOperatorOwnership(operatorId, request.getTargetType(), request.getTargetId());
        validateTargetResource(request.getTargetType(), request.getTargetId());

        String code = generateUniqueCode();
        QrCode qr = QrCode.builder()
                .code(code)
                .label(request.getLabel().trim())
                .targetType(request.getTargetType().toUpperCase())
                .targetId(request.getTargetId())
                .campaignSource(trimToNull(request.getCampaignSource()))
                .campaignMedium(trimToNull(request.getCampaignMedium()))
                .campaignName(trimToNull(request.getCampaignName()))
                .operatorId(operatorId)
                .status("ACTIVE")
                .build();
        QrCode saved = qrCodeRepository.save(qr);
        return toResponse(saved, null);
    }

    @Transactional
    public QrCodeResponse updateStatus(UUID id, UpdateQrCodeRequest request) {
        QrCode qr = qrCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QR Code not found: " + id));
        applyUpdate(qr, request);
        return toResponse(qrCodeRepository.save(qr), null);
    }

    @Transactional
    public void delete(UUID id) {
        QrCode qr = qrCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QR Code not found: " + id));
        qrCodeRepository.delete(qr);
    }

    @Transactional
    public QrCodeResponse updateForOperator(UUID id, UUID operatorId, UpdateQrCodeRequest request) {
        QrCode qr = qrCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QR Code not found: " + id));
        if (qr.getOperatorId() == null || !operatorId.equals(qr.getOperatorId())) {
            throw new AccessDeniedException("Resource is outside the operator scope");
        }
        if (request.getTargetType() != null && !request.getTargetType().isBlank()) {
            validateOperatorOwnership(operatorId, request.getTargetType(), request.getTargetId());
        }
        applyUpdate(qr, request);
        return toResponse(qrCodeRepository.save(qr), null);
    }

    @Transactional(readOnly = true)
    public QrCodeStatsResponse getStats(UUID id) {
        QrCode qr = qrCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QR Code not found: " + id));
        return buildStats(qr);
    }

    @Transactional(readOnly = true)
    public QrCodeStatsResponse getStatsForOperator(UUID id, UUID operatorId) {
        QrCode qr = qrCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QR Code not found: " + id));
        if (qr.getOperatorId() == null || !operatorId.equals(qr.getOperatorId())) {
            throw new AccessDeniedException("Resource is outside the operator scope");
        }
        return buildStats(qr);
    }

    private QrCodeStatsResponse buildStats(QrCode qr) {
        long totalScans = routeEventRepository.countByQrCodeIdAndCategory(qr.getId(), EventCategory.QR_SCAN);
        long effectiveViews = routeEventRepository.countByQrCodeIdAndCategoryIn(
                qr.getId(),
                List.of(EventCategory.ROUTE_VIEW, EventCategory.STOP_VIEW, EventCategory.PAGE_VIEW));

        List<RouteEvent> scanEvents = routeEventRepository.findByQrCodeIdAndCategoryOrderByRecordedAtAsc(
                qr.getId(), EventCategory.QR_SCAN);

        Map<LocalDate, Long> scansByDay = new TreeMap<>();
        for (RouteEvent e : scanEvents) {
            LocalDate day = e.getRecordedAt().atZone(LIMA_ZONE).toLocalDate();
            scansByDay.merge(day, 1L, Long::sum);
        }

        List<QrCodeStatsResponse.DailyScanStat> daily = scansByDay.entrySet().stream()
                .map(entry -> new QrCodeStatsResponse.DailyScanStat(entry.getKey(), entry.getValue()))
                .toList();

        return QrCodeStatsResponse.builder()
                .id(qr.getId())
                .code(qr.getCode())
                .label(qr.getLabel())
                .status(qr.getStatus())
                .totalScans(totalScans)
                .effectiveViews(effectiveViews)
                .dailyScans(daily)
                .build();
    }

    private void applyUpdate(QrCode qr, UpdateQrCodeRequest request) {
        if (request.getLabel() != null && !request.getLabel().isBlank()) {
            qr.setLabel(request.getLabel().trim());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            qr.setStatus(request.getStatus().toUpperCase());
        }
        if (request.getTargetType() != null && !request.getTargetType().isBlank()) {
            String targetType = request.getTargetType().toUpperCase();
            UUID targetId = request.getTargetId();
            if ("HOME".equals(targetType) || "CAMPAIGN".equals(targetType)) {
                targetId = null;
            }
            validateTargetResource(targetType, targetId);
            qr.setTargetType(targetType);
            qr.setTargetId(targetId);
        } else if (request.getTargetId() != null) {
            if (!"ROUTE".equalsIgnoreCase(qr.getTargetType()) && !"STOP".equalsIgnoreCase(qr.getTargetType())) {
                throw new BadRequestException("targetId is only valid for ROUTE or STOP destinations");
            }
            validateTargetResource(qr.getTargetType(), request.getTargetId());
            qr.setTargetId(request.getTargetId());
        }
        if (request.getCampaignSource() != null) {
            qr.setCampaignSource(trimToNull(request.getCampaignSource()));
        }
        if (request.getCampaignMedium() != null) {
            qr.setCampaignMedium(trimToNull(request.getCampaignMedium()));
        }
        if (request.getCampaignName() != null) {
            qr.setCampaignName(trimToNull(request.getCampaignName()));
        }
    }

    public void validateOperatorOwnership(UUID operatorId, String targetType, UUID targetId) {
        if (operatorId == null) return;
        if ("ROUTE".equalsIgnoreCase(targetType) && targetId != null) {
            Route route = routeRepository.findById(targetId)
                    .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + targetId));
            if (route.getTransportLine() == null || route.getTransportLine().getOperator() == null
                    || !operatorId.equals(route.getTransportLine().getOperator().getId())) {
                throw new AccessDeniedException("Route does not belong to this operator");
            }
        }
    }

    private void validateTargetResource(String targetType, UUID targetId) {
        if ("ROUTE".equalsIgnoreCase(targetType)) {
            if (targetId == null) throw new BadRequestException("targetId is required for ROUTE destination");
            if (!routeRepository.existsById(targetId)) throw new ResourceNotFoundException("Route not found: " + targetId);
        } else if ("STOP".equalsIgnoreCase(targetType)) {
            if (targetId == null) throw new BadRequestException("targetId is required for STOP destination");
            if (!stopRepository.existsById(targetId)) throw new ResourceNotFoundException("Stop not found: " + targetId);
        }
    }

    private Map<UUID, Long> fetchScanCountsMap() {
        return routeEventRepository.countAllScansByQrCodeId().stream()
                .collect(Collectors.toMap(
                        RouteEventRepository.QrScanCountRow::getQrCodeId,
                        RouteEventRepository.QrScanCountRow::getScanCount,
                        (a, b) -> a));
    }

    private QrCodeResponse toResponse(QrCode qr, Map<UUID, Long> scanCounts) {
        long scans = scanCounts != null && scanCounts.containsKey(qr.getId())
                ? scanCounts.get(qr.getId())
                : routeEventRepository.countByQrCodeIdAndCategory(qr.getId(), EventCategory.QR_SCAN);
        String operatorName = null;
        if (qr.getOperatorId() != null) {
            operatorName = operatorRepository.findById(qr.getOperatorId())
                    .map(Operator::getName)
                    .orElse(null);
        }
        return QrCodeResponse.builder()
                .id(qr.getId())
                .code(qr.getCode())
                .label(qr.getLabel())
                .targetType(qr.getTargetType())
                .targetId(qr.getTargetId())
                .targetTitle(resolveTargetTitle(qr))
                .campaignSource(qr.getCampaignSource())
                .campaignMedium(qr.getCampaignMedium())
                .campaignName(qr.getCampaignName())
                .status(qr.getStatus())
                .operatorId(qr.getOperatorId())
                .operatorName(operatorName)
                .canonicalUrl(getCanonicalUrl(qr.getCode()))
                .targetUrl(buildDestinationUrl(qr))
                .totalScans(scans)
                .createdAt(qr.getCreatedAt())
                .updatedAt(qr.getUpdatedAt())
                .build();
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
