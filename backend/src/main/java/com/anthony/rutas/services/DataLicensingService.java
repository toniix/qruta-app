package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.DataCoverageResponse;
import com.anthony.rutas.dtos.response.DataLicenseInfo;
import com.anthony.rutas.dtos.response.OdMatrixResponse;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.DataAccessLog;
import com.anthony.rutas.entities.DataApiKey;
import com.anthony.rutas.entities.DataLicense;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.RouteDailyStat;
import com.anthony.rutas.entities.RouteDirection;
import com.anthony.rutas.entities.RouteStop;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.exceptions.InvalidApiKeyException;
import com.anthony.rutas.exceptions.QuotaExceededException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.DataAccessLogRepository;
import com.anthony.rutas.repositories.DataApiKeyRepository;
import com.anthony.rutas.repositories.RouteDailyStatRepository;
import com.anthony.rutas.repositories.RouteDirectionRepository;
import com.anthony.rutas.repositories.RouteRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import com.anthony.rutas.repositories.StopRepository;
import com.anthony.rutas.utils.HashUtils;
import com.anthony.rutas.utils.SlugUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DataLicensingService {

    private static final int MIN_OD_WEIGHT = 5;
    private static final int MAX_OD_PAIRS = 20;
    private static final int OD_WINDOW_DAYS = 90;

    private final CityRepository cityRepository;
    private final DataApiKeyRepository apiKeyRepository;
    private final DataAccessLogRepository accessLogRepository;
    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final RouteDirectionRepository routeDirectionRepository;
    private final RouteStopRepository routeStopRepository;
    private final RouteDailyStatRepository dailyStatRepository;

    @Transactional
    public DataCoverageResponse coverage(String rawKey, String citySlug) {
        String slug = SlugUtils.toCitySlug(citySlug);
        DataApiKey apiKey = authorize(rawKey);
        City city = resolveCity(slug);
        consume(apiKey, "/api/data/v1/coverage/" + slug, slug);
        List<Route> routes = publishedRoutes(city);
        List<Stop> stops = nullSafe(stopRepository.findByCityId(city.getId()));
        Set<String> zones = new HashSet<>();
        stops.forEach(stop -> zones.add(zone(stop, city)));
        double latitude = number(city.getLatitude());
        double cellAreaSqKm = 0.01 * 111.32 * 111.32 * Math.cos(Math.toRadians(latitude));
        DataCoverageResponse.SpatialCoverage spatial = new DataCoverageResponse.SpatialCoverage(
                zones.size(),
                zones.size() * Math.abs(cellAreaSqKm),
                latitude,
                number(city.getLongitude()),
                number(city.getRadiusKm()));
        return new DataCoverageResponse(slug, city.getName(), routes.size(), stops.size(), spatial,
                licenseInfo(apiKey), Instant.now());
    }

    @Transactional
    public OdMatrixResponse odMatrix(String rawKey, String citySlug) {
        String slug = SlugUtils.toCitySlug(citySlug);
        DataApiKey apiKey = authorize(rawKey);
        City city = resolveCity(slug);
        consume(apiKey, "/api/data/v1/od-matrix/" + slug, slug);

        LocalDate to = LocalDate.now(ZoneOffset.UTC);
        LocalDate from = to.minusDays(OD_WINDOW_DAYS);
        Map<UUID, Integer> weightByRoute = new HashMap<>();
        nullSafe(dailyStatRepository.findByCityIdAndDateBetweenOrderByDateAsc(city.getId(), from, to))
                .forEach(stat -> {
                    UUID routeId = stat.getRouteId() != null ? stat.getRouteId() : stat.getTransportLineId();
                    if (routeId != null) {
                        weightByRoute.merge(routeId, totalWeight(stat), Integer::sum);
                    }
                });

        Map<ZonePair, Integer> weightByPair = new HashMap<>();
        for (Route route : publishedRoutes(city)) {
            int routeWeight = weightByRoute.getOrDefault(route.getId(), 0);
            if (routeWeight <= 0) {
                continue;
            }
            for (RouteDirection direction : nullSafe(routeDirectionRepository.findByRouteIdWithStops(route.getId()))) {
                List<RouteStop> routeStops = nullSafe(routeStopRepository.findByDirectionIdOrderByStopOrderAsc(direction.getId()))
                        .stream()
                        .filter(routeStop -> routeStop.getStop() != null)
                        .sorted(Comparator.comparing(RouteStop::getStopOrder, Comparator.nullsLast(Integer::compareTo)))
                        .toList();
                for (int index = 1; index < routeStops.size(); index++) {
                    ZonePair pair = new ZonePair(
                            zone(routeStops.get(index - 1).getStop(), city),
                            zone(routeStops.get(index).getStop(), city));
                    weightByPair.merge(pair, routeWeight, Integer::sum);
                }
            }
        }

        List<OdMatrixResponse.OdPair> pairs = weightByPair.entrySet().stream()
                .filter(entry -> entry.getValue() >= MIN_OD_WEIGHT)
                .sorted(Map.Entry.<ZonePair, Integer>comparingByValue().reversed()
                        .thenComparing(entry -> entry.getKey().origin())
                        .thenComparing(entry -> entry.getKey().destination()))
                .limit(MAX_OD_PAIRS)
                .map(entry -> new OdMatrixResponse.OdPair(entry.getKey().origin(), entry.getKey().destination(), entry.getValue()))
                .toList();
        return new OdMatrixResponse(slug, Instant.now(), licenseInfo(apiKey), pairs);
    }

    private DataApiKey authorize(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            throw new InvalidApiKeyException("X-Api-Key header is required");
        }
        DataApiKey apiKey = apiKeyRepository.findByKeyHash(hash(rawKey.trim()))
                .orElseThrow(() -> new InvalidApiKeyException("API key is not valid"));
        if (!apiKey.isActive()) {
            throw new InvalidApiKeyException("API key is not active");
        }
        DataLicense license = apiKey.getLicense();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (license == null || !license.isActive()
                || (license.getValidFrom() != null && license.getValidFrom().isAfter(today))
                || (license.getValidUntil() != null && license.getValidUntil().isBefore(today))) {
            throw new InvalidApiKeyException("License is not valid");
        }
        LocalDate currentPeriod = YearMonth.now(ZoneOffset.UTC).atDay(1);
        if (apiKey.getPeriodStart() != null
                && !apiKey.getPeriodStart().isBefore(currentPeriod)
                && apiKey.getUsedThisPeriod() >= apiKey.getMonthlyQuota()) {
            throw new QuotaExceededException("Monthly quota exhausted");
        }
        return apiKey;
    }

    private void consume(DataApiKey apiKey, String endpoint, String citySlug) {
        LocalDate currentPeriod = YearMonth.now(ZoneOffset.UTC).atDay(1);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        int updated = apiKeyRepository.consumeQuotaAtomically(apiKey.getId(), currentPeriod, now);
        if (updated == 0) {
            throw new QuotaExceededException("Monthly quota exhausted");
        }
        if (apiKey.getPeriodStart() == null || apiKey.getPeriodStart().isBefore(currentPeriod)) {
            apiKey.setPeriodStart(currentPeriod);
            apiKey.setUsedThisPeriod(1);
        } else {
            apiKey.setUsedThisPeriod(apiKey.getUsedThisPeriod() + 1);
        }
        apiKey.setLastUsedAt(now);
        accessLogRepository.save(DataAccessLog.builder()
                .apiKey(apiKey)
                .endpoint(endpoint)
                .citySlug(citySlug)
                .statusCode(200)
                .build());
    }

    private List<Route> publishedRoutes(City city) {
        return nullSafe(routeRepository.findAllByCityIdWithTransportLine(city.getId())).stream()
                .filter(route -> route.getStatus() == null || "ACTIVE".equalsIgnoreCase(route.getStatus()))
                .filter(route -> route.getTransportLine() != null)
                .filter(route -> route.getTransportLine().getStatus() == null
                        || "ACTIVE".equalsIgnoreCase(route.getTransportLine().getStatus()))
                .toList();
    }

    private City resolveCity(String slug) {
        return cityRepository.findAll().stream()
                .filter(city -> slug.equals(SlugUtils.toCitySlug(city.getName())))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("City not found for slug: " + slug));
    }

    private DataLicenseInfo licenseInfo(DataApiKey apiKey) {
        DataLicense license = apiKey.getLicense();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        long remainingDays = license.getValidUntil() == null
                ? Long.MAX_VALUE : ChronoUnit.DAYS.between(today, license.getValidUntil());
        return new DataLicenseInfo(apiKey.getPlan(), license.getValidUntil(), remainingDays,
                apiKey.getMonthlyQuota(), Math.max(0, apiKey.getMonthlyQuota() - apiKey.getUsedThisPeriod()));
    }

    private static int totalWeight(RouteDailyStat stat) {
        return stat.getViews() + stat.getSearches() + stat.getQrScans()
                + stat.getStopViews() + stat.getNearbyQueries() + stat.getCommunityPosts();
    }

    private static String hash(String rawKey) {
        return HashUtils.sha256Hex(rawKey);
    }

    private static String zone(Stop stop, City city) {
        double lat = stop.getLocation() == null || stop.getLocation().getY() == 0
                ? number(city.getLatitude()) : stop.getLocation().getY();
        double lon = stop.getLocation() == null || stop.getLocation().getX() == 0
                ? number(city.getLongitude()) : stop.getLocation().getX();
        return String.format(Locale.ROOT, "%.2f;%.2f", lat, lon);
    }

    private static double number(BigDecimal value) {
        return value == null ? 0 : value.doubleValue();
    }

    private static <T> List<T> nullSafe(List<T> values) {
        return values == null ? List.of() : values;
    }

    private record ZonePair(String origin, String destination) {
    }
}
