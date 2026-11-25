package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.DataCoverageResponse;
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
import com.anthony.rutas.entities.TransportLine;
import com.anthony.rutas.exceptions.InvalidApiKeyException;
import com.anthony.rutas.exceptions.QuotaExceededException;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.DataAccessLogRepository;
import com.anthony.rutas.repositories.DataApiKeyRepository;
import com.anthony.rutas.repositories.RouteDailyStatRepository;
import com.anthony.rutas.repositories.RouteDirectionRepository;
import com.anthony.rutas.repositories.RouteRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import com.anthony.rutas.repositories.StopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataLicensingServiceTest {

    private static final String RAW_KEY = "license-key";

    @Mock
    private CityRepository cityRepository;
    @Mock
    private DataApiKeyRepository apiKeyRepository;
    @Mock
    private DataAccessLogRepository accessLogRepository;
    @Mock
    private RouteRepository routeRepository;
    @Mock
    private StopRepository stopRepository;
    @Mock
    private RouteDirectionRepository routeDirectionRepository;
    @Mock
    private RouteStopRepository routeStopRepository;
    @Mock
    private RouteDailyStatRepository dailyStatRepository;

    private DataLicensingService service;
    private City city;
    private DataApiKey apiKey;
    private UUID operatorId;
    private Route route;
    private RouteDirection direction;

    @BeforeEach
    void setUp() {
        service = new DataLicensingService(cityRepository, apiKeyRepository, accessLogRepository, routeRepository,
                stopRepository, routeDirectionRepository, routeStopRepository, dailyStatRepository);

        operatorId = UUID.randomUUID();
        DataLicense license = DataLicense.builder()
                .id(UUID.randomUUID())
                .clientName("Municipalidad")
                .plan("PRO")
                .validFrom(LocalDate.now(ZoneOffset.UTC).minusDays(1))
                .validUntil(LocalDate.now(ZoneOffset.UTC).plusDays(30))
                .monthlyQuota(100)
                .active(true)
                .build();
        apiKey = DataApiKey.builder()
                .id(UUID.randomUUID())
                .keyHash(hash(RAW_KEY))
                .clientName("Municipalidad")
                .plan("PRO")
                .monthlyQuota(10)
                .usedThisPeriod(0)
                .periodStart(YearMonth.now(ZoneOffset.UTC).atDay(1))
                .active(true)
                .operatorId(operatorId)
                .license(license)
                .build();

        city = City.builder()
                .id(UUID.randomUUID())
                .name("Lima")
                .department("Lima")
                .country("PE")
                .latitude(new BigDecimal("-12.0464"))
                .longitude(new BigDecimal("-77.0428"))
                .radiusKm(new BigDecimal("30.00"))
                .build();
        TransportLine line = TransportLine.builder()
                .id(UUID.randomUUID())
                .city(city)
                .company("Consorcio 101")
                .status("ACTIVE")
                .build();
        route = Route.builder()
                .id(UUID.randomUUID())
                .transportLine(line)
                .code("101-A")
                .name("Ruta Centro")
                .status("ACTIVE")
                .build();
        direction = RouteDirection.builder()
                .id(UUID.randomUUID())
                .route(route)
                .direction("IDA")
                .build();
    }

    @Test
    void rejectsUnknownApiKey() {
        when(apiKeyRepository.findByKeyHash(anyString())).thenReturn(Optional.empty());

        assertThrows(InvalidApiKeyException.class, () -> service.coverage(RAW_KEY, "Lima"));
    }

    @Test
    void rejectsRequestWhenQuotaIsExhausted() {
        when(apiKeyRepository.findByKeyHash(hash(RAW_KEY))).thenReturn(Optional.of(apiKey));
        apiKey.setUsedThisPeriod(apiKey.getMonthlyQuota());

        assertThrows(QuotaExceededException.class, () -> service.coverage(RAW_KEY, "Lima"));
    }

    @Test
    void coverageReturnsCityAggregatesAndRegistersUsage() {
        when(apiKeyRepository.findByKeyHash(hash(RAW_KEY))).thenReturn(Optional.of(apiKey));
        when(apiKeyRepository.consumeQuotaAtomically(any(), any(), any())).thenReturn(1);
        Stop first = stop(-12.0100, -77.0200);
        Stop second = stop(-12.0464, -77.0428);
        when(cityRepository.findAll()).thenReturn(List.of(city));
        when(routeRepository.findAllByCityIdWithTransportLine(city.getId())).thenReturn(List.of(route));
        when(stopRepository.findByCityId(city.getId())).thenReturn(List.of(first, second));

        DataCoverageResponse response = service.coverage(RAW_KEY, "Lima");

        assertEquals("lima", response.citySlug());
        assertEquals(1, response.routeCount());
        assertEquals(2, response.stopCount());
        assertEquals(2, response.spatialCoverage().zoneCount());
        assertEquals(9, response.license().remainingQuota());
        assertFalse(response.toString().contains(operatorId.toString()));
        assertEquals(1, apiKey.getUsedThisPeriod());
        ArgumentCaptor<DataAccessLog> logCaptor = ArgumentCaptor.forClass(DataAccessLog.class);
        verify(accessLogRepository).save(logCaptor.capture());
        assertEquals("/api/data/v1/coverage/lima", logCaptor.getValue().getEndpoint());
    }

    @Test
    void rejectsWhenAtomicQuotaConsumptionFailsDueToConcurrency() {
        when(apiKeyRepository.findByKeyHash(hash(RAW_KEY))).thenReturn(Optional.of(apiKey));
        when(cityRepository.findAll()).thenReturn(List.of(city));
        when(apiKeyRepository.consumeQuotaAtomically(any(), any(), any())).thenReturn(0);

        assertThrows(QuotaExceededException.class, () -> service.coverage(RAW_KEY, "Lima"));
    }

    @Test
    void odMatrixSuppressesLowCountsAndReturnsOnlyAggregates() {
        when(apiKeyRepository.findByKeyHash(hash(RAW_KEY))).thenReturn(Optional.of(apiKey));
        when(apiKeyRepository.consumeQuotaAtomically(any(), any(), any())).thenReturn(1);
        Stop first = stop(-12.0100, -77.0200);
        Stop second = stop(-12.0464, -77.0428);
        when(cityRepository.findAll()).thenReturn(List.of(city));
        when(routeRepository.findAllByCityIdWithTransportLine(city.getId())).thenReturn(List.of(route));
        when(routeDirectionRepository.findByRouteIdWithStops(route.getId())).thenReturn(List.of(direction));
        when(routeStopRepository.findByDirectionIdOrderByStopOrderAsc(direction.getId())).thenReturn(List.of(
                routeStop(first, 1),
                routeStop(second, 2)));
        when(dailyStatRepository.findByCityIdAndDateBetweenOrderByDateAsc(any(), any(), any())).thenReturn(List.of(
                RouteDailyStat.builder()
                        .id(UUID.randomUUID())
                        .routeId(route.getId())
                        .cityId(city.getId())
                        .date(LocalDate.now(ZoneOffset.UTC))
                        .views(10)
                        .build(),
                RouteDailyStat.builder()
                        .id(UUID.randomUUID())
                        .routeId(UUID.randomUUID())
                        .cityId(city.getId())
                        .date(LocalDate.now(ZoneOffset.UTC))
                        .views(2)
                        .build()));

        OdMatrixResponse response = service.odMatrix(RAW_KEY, "Lima");

        assertEquals(1, response.pairs().size());
        assertEquals(10, response.pairs().get(0).weight());
        assertFalse(response.toString().contains(operatorId.toString()));
    }

    private static Stop stop(double latitude, double longitude) {
        return Stop.builder()
                .id(UUID.randomUUID())
                .name("Paradero")
                .location(new GeometryFactory().createPoint(new Coordinate(longitude, latitude)))
                .build();
    }

    private static RouteStop routeStop(Stop stop, int order) {
        return RouteStop.builder()
                .id(UUID.randomUUID())
                .stop(stop)
                .stopOrder(order)
                .build();
    }

    private static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }
}
