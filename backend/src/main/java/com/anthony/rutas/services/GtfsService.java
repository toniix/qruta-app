package com.anthony.rutas.services;

import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.RouteDirection;
import com.anthony.rutas.entities.RoutePoint;
import com.anthony.rutas.entities.RouteStop;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.entities.TransportLine;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.RouteDirectionRepository;
import com.anthony.rutas.repositories.RoutePointRepository;
import com.anthony.rutas.repositories.RouteRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import com.anthony.rutas.repositories.StopRepository;
import com.anthony.rutas.repositories.TransportLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
public class GtfsService {

    private static final String SERVICE_ID = "WEEKLY";
    private static final String AGENCY_ID = "QRUTA";
    private static final String AGENCY_URL = "https://qruta-app.vercel.app";
    private static final String AGENCY_TIMEZONE = "America/Lima";
    private static final String AGENCY_LANG = "es";

    private final CityRepository cityRepository;
    private final TransportLineRepository transportLineRepository;
    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final RouteDirectionRepository routeDirectionRepository;
    private final RouteStopRepository routeStopRepository;
    private final RoutePointRepository routePointRepository;
    private final GtfsCacheService gtfsCacheService;

    @Transactional(readOnly = true)
    public byte[] getFeed(String citySlug) {
        String slug = slugify(citySlug);
        CatalogSnapshot catalog = loadCatalog(slug);
        String version = catalogVersion(catalog);
        Optional<byte[]> cached = gtfsCacheService.get(slug, version);
        if (cached.isPresent()) {
            return cached.get();
        }
        byte[] feed = buildZip(catalog);
        gtfsCacheService.put(slug, version, feed);
        return feed;
    }

    @Transactional(readOnly = true)
    public byte[] generateFeed(String citySlug) {
        return buildZip(loadCatalog(slugify(citySlug)));
    }

    @Transactional(readOnly = true)
    public byte[] buildFeed(String citySlug) {
        return generateFeed(citySlug);
    }

    @Transactional(readOnly = true)
    public String catalogVersion(String citySlug) {
        return catalogVersion(loadCatalog(slugify(citySlug)));
    }

    public static String slugify(String value) {
        return com.anthony.rutas.utils.SlugUtils.toCitySlug(value);
    }

    private CatalogSnapshot loadCatalog(String slug) {
        City city = cityRepository.findAll().stream()
                .filter(candidate -> slug.equals(slugify(candidate.getName())))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("City not found for slug: " + slug));

        List<TransportLine> lines = nullSafe(transportLineRepository.findByCityIdWithCity(city.getId())).stream()
                .filter(line -> isActive(line.getStatus()))
                .toList();
        List<Route> routes = nullSafe(routeRepository.findAllByCityIdWithTransportLine(city.getId())).stream()
                .filter(route -> isActive(route.getStatus()))
                .filter(route -> route.getTransportLine() != null)
                .filter(route -> isActive(route.getTransportLine().getStatus()))
                .toList();
        List<Stop> stops = nullSafe(stopRepository.findByCityId(city.getId()));

        Map<UUID, List<RouteDirection>> directionsByRoute = new LinkedHashMap<>();
        Map<UUID, List<RouteStop>> stopsByDirection = new LinkedHashMap<>();
        Map<UUID, List<RoutePoint>> pointsByDirection = new LinkedHashMap<>();

        for (Route route : routes) {
            List<RouteDirection> directions = nullSafe(routeDirectionRepository.findByRouteIdWithStops(route.getId()))
                    .stream()
                    .sorted(Comparator.comparing(direction -> direction.getDirection(), Comparator.nullsLast(String::compareTo)))
                    .toList();
            directionsByRoute.put(route.getId(), directions);
            for (RouteDirection direction : directions) {
                List<RouteStop> routeStops = direction.getRouteStops();
                if (routeStops == null || routeStops.isEmpty()) {
                    routeStops = nullSafe(routeStopRepository.findByDirectionIdOrderByStopOrderAsc(direction.getId()));
                }
                stopsByDirection.put(direction.getId(), routeStops.stream()
                        .sorted(Comparator.comparing(RouteStop::getStopOrder, Comparator.nullsLast(Integer::compareTo)))
                        .toList());
                pointsByDirection.put(direction.getId(), nullSafe(routePointRepository.findByDirectionIdOrderByPointOrderAsc(direction.getId()))
                        .stream()
                        .sorted(Comparator.comparing(RoutePoint::getPointOrder, Comparator.nullsLast(Integer::compareTo)))
                        .toList());
            }
        }
        return new CatalogSnapshot(city, lines, routes, stops, directionsByRoute, stopsByDirection, pointsByDirection);
    }

    private String catalogVersion(CatalogSnapshot catalog) {
        StringBuilder raw = new StringBuilder("qruta-gtfs-v1|").append(slugify(catalog.city().getName())).append('|');
        appendEntity(raw, catalog.city());
        appendCollection(raw, catalog.lines());
        appendCollection(raw, catalog.routes());
        appendCollection(raw, catalog.stops());
        catalog.directionsByRoute().values().forEach(directions -> {
            appendCollection(raw, directions);
            directions.forEach(direction -> {
                appendCollection(raw, catalog.stopsByDirection().getOrDefault(direction.getId(), List.of()));
                appendCollection(raw, catalog.pointsByDirection().getOrDefault(direction.getId(), List.of()));
            });
        });
        return com.anthony.rutas.utils.HashUtils.sha256Hex(raw.toString()).substring(0, 16);
    }

    private byte[] buildZip(CatalogSnapshot catalog) {
        List<String[]> routeRows = new ArrayList<>();
        List<TripInfo> trips = new ArrayList<>();
        List<String[]> stopTimeRows = new ArrayList<>();
        List<String[]> shapeRows = new ArrayList<>();

        for (TransportLine line : catalog.lines()) {
            List<Route> lineRoutes = catalog.routes().stream()
                    .filter(route -> line.getId() != null && line.getId().equals(route.getTransportLine().getId()))
                    .toList();
            for (Route route : lineRoutes) {
                List<RouteDirection> directions = catalog.directionsByRoute().getOrDefault(route.getId(), List.of());
                if (directions.isEmpty()) {
                    String routeId = id(route.getId());
                    routeRows.add(routeRow(routeId, route.getCode(), route.getName(), route.getColor()));
                    trips.add(new TripInfo(routeId, routeId, route.getName(), null, null, null, List.of()));
                    continue;
                }
                for (RouteDirection direction : directions) {
                    String routeId = id(direction.getId());
                    String headsign = valueOrDefault(direction.getDestinationName(), route.getName());
                    routeRows.add(routeRow(routeId, route.getCode(), route.getName() + " - " + headsign, route.getColor()));
                    List<RouteStop> routeStops = catalog.stopsByDirection().getOrDefault(direction.getId(), List.of());
                    trips.add(new TripInfo(id(direction.getId()), routeId, headsign, direction.getId(),
                            direction.getDirection(), direction.getEstimatedMinutes(), routeStops));
                    shapeRows.addAll(shapeRows(catalog, direction,
                            catalog.pointsByDirection().getOrDefault(direction.getId(), List.of())));
                }
            }
        }

        for (TripInfo trip : trips) {
            stopTimeRows.addAll(stopTimeRows(trip));
        }

        Map<String, String> files = new LinkedHashMap<>();
        files.put("agency.txt", header("agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang")
                + csvRow(AGENCY_ID, "QRuta", AGENCY_URL, AGENCY_TIMEZONE, AGENCY_LANG));
        files.put("routes.txt", header("route_id", "agency_id", "route_short_name", "route_long_name",
                "route_desc", "route_type", "route_color", "route_text_color")
                + rows(routeRows));
        files.put("trips.txt", header("route_id", "service_id", "trip_id", "trip_headsign", "direction_id", "shape_id")
                + tripRows(trips));
        files.put("stops.txt", header("stop_id", "stop_name", "stop_desc", "stop_lat", "stop_lon",
                "location_type", "parent_station", "wheelchair_boarding")
                + stopRows(catalog));
        files.put("stop_times.txt", header("trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence",
                "stop_headsign", "pickup_type", "drop_off_type", "shape_dist_traveled", "timepoint")
                + rows(stopTimeRows));
        files.put("shapes.txt", header("shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence",
                "shape_dist_traveled")
                + rows(shapeRows));
        files.put("calendar.txt", header("service_id", "monday", "tuesday", "wednesday", "thursday", "friday",
                "saturday", "sunday", "start_date", "end_date")
                + csvRow(SERVICE_ID, 1, 1, 1, 1, 1, 1, 1, "20000101", "20991231"));
        return zip(files);
    }

    private String[] routeRow(String routeId, String shortName, String longName, String color) {
        return new String[]{routeId, AGENCY_ID, valueOrDefault(shortName, routeId), longName, "", "3",
                valueOrDefault(color, "FFFFFF").replace("#", ""), "000000"};
    }

    private String tripRows(List<TripInfo> trips) {
        StringBuilder builder = new StringBuilder();
        for (TripInfo trip : trips) {
            String directionId = trip.directionId() == null
                    ? ""
                    : ("VUELTA".equals(trip.direction()) ? "1" : "0");
            String shapeId = trip.directionId() == null ? "" : id(trip.directionId());
            builder.append(csvRow(trip.routeId(), SERVICE_ID, trip.tripId(), trip.headsign(), directionId, shapeId));
        }
        return builder.toString();
    }

    private List<String[]> stopTimeRows(TripInfo trip) {
        List<String[]> rows = new ArrayList<>();
        List<RouteStop> routeStops = trip.routeStops();
        if (routeStops.isEmpty()) {
            return rows;
        }
        int totalMinutes = trip.estimatedMinutes() == null || trip.estimatedMinutes() <= 0
                ? 30 : trip.estimatedMinutes();
        for (int index = 0; index < routeStops.size(); index++) {
            RouteStop routeStop = routeStops.get(index);
            if (routeStop.getStop() == null) {
                continue;
            }
            int minute = routeStops.size() == 1 ? 0
                    : (int) Math.round((double) index / (routeStops.size() - 1) * totalMinutes);
            String time = formatTime(minute);
            String distance = routeStop.getDistanceFromStart() == null
                    ? "" : String.format(Locale.ROOT, "%.1f", routeStop.getDistanceFromStart());
            rows.add(new String[]{trip.tripId(), time, time, id(routeStop.getStop().getId()),
                    String.valueOf(index + 1), "", "0", "0", distance, "1"});
        }
        return rows;
    }

    private List<String[]> shapeRows(CatalogSnapshot catalog, RouteDirection direction, List<RoutePoint> points) {
        List<String[]> rows = new ArrayList<>();
        double cumulative = 0;
        double previousLat = 0;
        double previousLon = 0;
        int sequence = 1;
        for (RoutePoint point : points) {
            if (point.getLocation() == null) {
                continue;
            }
            double lat = point.getLocation().getY();
            double lon = point.getLocation().getX();
            if (sequence > 1) {
                cumulative += haversineMeters(previousLat, previousLon, lat, lon);
            }
            rows.add(new String[]{id(direction.getId()), decimal(lat), decimal(lon), String.valueOf(sequence++),
                    String.format(Locale.ROOT, "%.1f", cumulative)});
            previousLat = lat;
            previousLon = lon;
        }
        return rows;
    }

    private String stopRows(CatalogSnapshot catalog) {
        StringBuilder builder = new StringBuilder();
        for (Stop stop : catalog.stops()) {
            double lat = stop.getLocation() == null ? number(catalog.city().getLatitude()) : stop.getLocation().getY();
            double lon = stop.getLocation() == null ? number(catalog.city().getLongitude()) : stop.getLocation().getX();
            int wheelchair = stop.isAccessible() ? 1 : 2;
            builder.append(csvRow(id(stop.getId()), stop.getName(), "", decimal(lat), decimal(lon),
                    "0", "", wheelchair));
        }
        return builder.toString();
    }

    private static String header(String... columns) {
        return String.join(",", columns) + "\n";
    }

    private static String rows(List<String[]> rows) {
        StringBuilder builder = new StringBuilder();
        rows.forEach(row -> builder.append(csvRow((Object[]) row)));
        return builder.toString();
    }

    private static String csvRow(Object... values) {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < values.length; index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append(csvValue(values[index]));
        }
        return builder.append('\n').toString();
    }

    private static String csvValue(Object value) {
        String safe = value == null ? "" : String.valueOf(value);
        if (safe.contains(",") || safe.contains("\"") || safe.contains("\n") || safe.contains("\r")) {
            return "\"" + safe.replace("\"", "\"\"") + "\"";
        }
        return safe;
    }

    private static String formatTime(int minutes) {
        return String.format(Locale.ROOT, "%02d:%02d:00", minutes / 60, minutes % 60);
    }

    private static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double radius = 6_371_000;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        return 2 * radius * Math.asin(Math.sqrt(a));
    }

    private static String decimal(double value) {
        return String.format(Locale.ROOT, "%.6f", value);
    }

    private static double number(BigDecimal value) {
        return value == null ? 0 : value.doubleValue();
    }

    private static String id(UUID value) {
        return value == null ? "" : value.toString();
    }

    private static String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static boolean isActive(String status) {
        return status == null || "ACTIVE".equalsIgnoreCase(status);
    }

    private static <T> List<T> nullSafe(List<T> values) {
        return values == null ? List.of() : values;
    }

    private void appendEntity(StringBuilder builder, Object entity) {
        if (entity == null) {
            return;
        }
        builder.append(entity.getClass().getSimpleName()).append('{');
        Arrays.stream(entity.getClass().getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()) && !field.isSynthetic())
                .sorted(Comparator.comparing(Field::getName))
                .forEach(field -> {
                    try {
                        field.setAccessible(true);
                        Object value = field.get(entity);
                        if (isVersionValue(value)) {
                            builder.append(field.getName()).append('=').append(value).append(';');
                        }
                    } catch (IllegalAccessException ignored) {
                    }
                });
        builder.append('}');
    }

    private static boolean isVersionValue(Object value) {
        return value == null
                || value instanceof CharSequence
                || value instanceof Number
                || value instanceof Boolean
                || value instanceof UUID
                || value instanceof java.time.temporal.Temporal;
    }

    private void appendCollection(StringBuilder builder, Collection<?> values) {
        builder.append(values.size()).append(';');
        values.forEach(value -> appendEntity(builder, value));
    }

    private static byte[] zip(Map<String, String> files) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output)) {
            for (Map.Entry<String, String> file : files.entrySet()) {
                zip.putNextEntry(new ZipEntry(file.getKey()));
                zip.write(file.getValue().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Could not build GTFS zip", exception);
        }
        return output.toByteArray();
    }

    private record CatalogSnapshot(
            City city,
            List<TransportLine> lines,
            List<Route> routes,
            List<Stop> stops,
            Map<UUID, List<RouteDirection>> directionsByRoute,
            Map<UUID, List<RouteStop>> stopsByDirection,
            Map<UUID, List<RoutePoint>> pointsByDirection) {
    }

    private record TripInfo(String tripId, String routeId, String headsign, UUID directionId,
                            String direction, Integer estimatedMinutes, List<RouteStop> routeStops) {
    }
}
