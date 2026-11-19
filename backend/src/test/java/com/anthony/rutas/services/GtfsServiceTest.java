package com.anthony.rutas.services;

import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.RouteDirection;
import com.anthony.rutas.entities.RoutePoint;
import com.anthony.rutas.entities.RouteStop;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.entities.TransportLine;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.RouteDirectionRepository;
import com.anthony.rutas.repositories.RoutePointRepository;
import com.anthony.rutas.repositories.RouteRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import com.anthony.rutas.repositories.StopRepository;
import com.anthony.rutas.repositories.TransportLineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GtfsServiceTest {

    @Mock
    private CityRepository cityRepository;
    @Mock
    private TransportLineRepository transportLineRepository;
    @Mock
    private RouteRepository routeRepository;
    @Mock
    private StopRepository stopRepository;
    @Mock
    private RouteDirectionRepository routeDirectionRepository;
    @Mock
    private RouteStopRepository routeStopRepository;
    @Mock
    private RoutePointRepository routePointRepository;
    @Mock
    private GtfsCacheService cacheService;

    private GtfsService service;
    private City city;
    private Route route;
    private RouteDirection direction;
    private Stop firstStop;
    private Stop secondStop;

    @BeforeEach
    void setUp() {
        service = new GtfsService(cityRepository, transportLineRepository, routeRepository, stopRepository,
                routeDirectionRepository, routeStopRepository, routePointRepository, cacheService);

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
                .code("101")
                .name("Linea 101")
                .status("ACTIVE")
                .build();
        route = Route.builder()
                .id(UUID.randomUUID())
                .transportLine(line)
                .code("101-A")
                .name("Ruta Centro")
                .color("FF0000")
                .status("ACTIVE")
                .build();
        direction = RouteDirection.builder()
                .id(UUID.randomUUID())
                .route(route)
                .direction("OUTBOUND")
                .destinationName("Centro")
                .estimatedMinutes(20)
                .build();
        firstStop = stop("Parque", -12.0100, -77.0200);
        secondStop = stop("Centro", -12.0464, -77.0428);
        Stop otherCityStop = stop("Otro", -12.1000, -77.1000);

        when(cityRepository.findAll()).thenReturn(List.of(city));
        when(transportLineRepository.findByCityIdWithCity(city.getId())).thenReturn(List.of(line));
        when(routeRepository.findAllByCityIdWithTransportLine(city.getId())).thenReturn(List.of(route));
        when(stopRepository.findByCityId(city.getId())).thenReturn(List.of(firstStop, secondStop));
        when(routeDirectionRepository.findByRouteIdWithStops(route.getId())).thenReturn(List.of(direction));
        when(routeStopRepository.findByDirectionIdOrderByStopOrderAsc(direction.getId())).thenReturn(List.of(
                routeStop(firstStop, 1, 0.0),
                routeStop(secondStop, 2, 3500.0)));
        when(routePointRepository.findByDirectionIdOrderByPointOrderAsc(direction.getId())).thenReturn(List.of(
                routePoint(-12.0100, -77.0200, 1),
                routePoint(-12.0464, -77.0428, 2)));
    }

    @Test
    void buildFeedContainsAllGtfsFilesWithExpectedRows() {
        Map<String, String> files = readZip(service.buildFeed("Lima"));

        assertTrue(files.keySet().containsAll(List.of("agency.txt", "routes.txt", "trips.txt", "stops.txt",
                "stop_times.txt", "shapes.txt", "calendar.txt")));
        assertEquals("agency_id,agency_name,agency_url,agency_timezone,agency_lang\n", files.get("agency.txt")
                .substring(0, files.get("agency.txt").indexOf('\n') + 1));
        assertEquals(2, lineCount(files.get("routes.txt")));
        assertEquals(2, lineCount(files.get("trips.txt")));
        assertEquals(3, lineCount(files.get("stops.txt")));
        assertEquals(3, lineCount(files.get("stop_times.txt")));
        assertEquals(3, lineCount(files.get("shapes.txt")));
        assertEquals(2, lineCount(files.get("calendar.txt")));
        assertFalse(files.get("stops.txt").contains("Otro"));
    }

    @Test
    void shapeDistancesAreCumulative() {
        Map<String, String> files = readZip(service.buildFeed("Lima"));
        String[] rows = files.get("shapes.txt").lines().skip(1).toArray(String[]::new);

        assertEquals(2, rows.length);
        assertEquals("0.0", rows[0].split(",")[4]);
        assertTrue(Double.parseDouble(rows[1].split(",")[4]) > 0);
    }

    @Test
    void catalogVersionChangesWhenCatalogChanges() {
        String first = service.catalogVersion("Lima");

        assertEquals(first, service.catalogVersion("Lima"));
        route.setName("Ruta Centro Actualizada");
        assertFalse(first.equals(service.catalogVersion("Lima")));
    }

    private static Stop stop(String name, double latitude, double longitude) {
        return Stop.builder()
                .id(UUID.randomUUID())
                .name(name)
                .location(new GeometryFactory().createPoint(new Coordinate(longitude, latitude)))
                .build();
    }

    private static RouteStop routeStop(Stop stop, int order, double distance) {
        return RouteStop.builder()
                .id(UUID.randomUUID())
                .stop(stop)
                .stopOrder(order)
                .distanceFromStart(distance)
                .build();
    }

    private static RoutePoint routePoint(double latitude, double longitude, int order) {
        return RoutePoint.builder()
                .id(UUID.randomUUID())
                .pointOrder(order)
                .location(new GeometryFactory().createPoint(new Coordinate(longitude, latitude)))
                .build();
    }

    private static long lineCount(String content) {
        return content.lines().count();
    }

    private static Map<String, String> readZip(byte[] bytes) {
        Map<String, String> files = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                files.put(entry.getName(), new String(zip.readAllBytes(), StandardCharsets.UTF_8));
            }
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
        return files;
    }
}
