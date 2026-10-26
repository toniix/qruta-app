package com.anthony.rutas.mappers;

import com.anthony.rutas.dtos.response.DirectionStopResponse;
import com.anthony.rutas.dtos.response.KeyStopResponse;
import com.anthony.rutas.entities.RouteStop;
import com.anthony.rutas.entities.Stop;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit tests for {@code toDirectionStopResponse}: reference image
 * propagation for citizen map selection. No mocks needed - entities are
 * built directly, so these run even where Mockito instrumentation is broken.
 */
@DisplayName("DtoMapper.toDirectionStopResponse")
class DtoMapperTest {

    private final GeometryFactory geometryFactory = new GeometryFactory();

    private Stop stopWithImage(String imageUrl) {
        Stop stop = new Stop();
        stop.setId(UUID.randomUUID());
        stop.setName("Paradero 12 - Corrientes y Urquiza");
        Point location = geometryFactory.createPoint(new Coordinate(-58.3816, -34.6037));
        stop.setLocation(location);
        stop.setReference("Esquina noroeste");
        stop.setAddress("Av. Corrientes 1234");
        stop.setAccessible(true);
        stop.setImageUrl(imageUrl);
        return stop;
    }

    @Test
    @DisplayName("propagates imageUrl so route-selected stops render the picture")
    void shouldPropagateImageUrl() {
        Stop stop = stopWithImage("https://proj.supabase.co/storage/v1/object/public/stop-images/stops/x/1.jpg");
        RouteStop routeStop = new RouteStop();
        routeStop.setStop(stop);
        routeStop.setStopOrder(3);

        DirectionStopResponse response = DtoMapper.toDirectionStopResponse(routeStop);

        assertNotNull(response);
        assertEquals("Paradero 12 - Corrientes y Urquiza", response.getName());
        assertEquals("https://proj.supabase.co/storage/v1/object/public/stop-images/stops/x/1.jpg", response.getImageUrl());
    }

    @Test
    @DisplayName("imageUrl is null when the stop has no reference image")
    void shouldPropagateNullImageUrl() {
        RouteStop routeStop = new RouteStop();
        routeStop.setStop(stopWithImage(null));
        routeStop.setStopOrder(1);

        DirectionStopResponse response = DtoMapper.toDirectionStopResponse(routeStop);

        assertNotNull(response);
        assertNull(response.getImageUrl());
    }

    @Test
    @DisplayName("KeyStopResponse propagates imageUrl so route list markers keep the picture")
    void shouldPropagateImageUrlOnKeyStopResponse() {
        Stop stop = stopWithImage("https://proj.supabase.co/storage/v1/object/public/stop-images/stops/x/1.jpg");

        KeyStopResponse response = DtoMapper.toKeyStopResponse(stop);

        assertNotNull(response);
        assertEquals("https://proj.supabase.co/storage/v1/object/public/stop-images/stops/x/1.jpg", response.getImageUrl());
    }

    @Test
    @DisplayName("KeyStopResponse imageUrl is null when the stop has no reference image")
    void shouldPropagateNullImageUrlOnKeyStopResponse() {
        KeyStopResponse response = DtoMapper.toKeyStopResponse(stopWithImage(null));

        assertNotNull(response);
        assertNull(response.getImageUrl());
    }

    @Test
    @DisplayName("RouteSummaryResponse, PopularRouteResponse, RouteDetailResponse and AdminRouteSummaryResponse propagate category and default to MICRO when null")
    void shouldMapRouteCategoryWithFallback() {
        com.anthony.rutas.entities.City testCity = com.anthony.rutas.entities.City.builder()
                .id(UUID.randomUUID())
                .name("Ica")
                .build();
        com.anthony.rutas.entities.TransportLine testLine = com.anthony.rutas.entities.TransportLine.builder()
                .id(UUID.randomUUID())
                .name("Linea 1")
                .city(testCity)
                .build();

        com.anthony.rutas.entities.Route routeWithCombi = com.anthony.rutas.entities.Route.builder()
                .id(UUID.randomUUID())
                .code("L1")
                .name("Ruta 1")
                .category("COMBI")
                .transportLine(testLine)
                .directions(java.util.List.of())
                .build();

        com.anthony.rutas.entities.Route routeWithNullCategory = com.anthony.rutas.entities.Route.builder()
                .id(UUID.randomUUID())
                .code("L2")
                .name("Ruta 2")
                .category(null)
                .transportLine(testLine)
                .directions(java.util.List.of())
                .build();

        // 1. AdminRouteSummaryResponse
        var admin1 = DtoMapper.toAdminRouteSummaryResponse(routeWithCombi);
        assertEquals("COMBI", admin1.getCategory());
        var admin2 = DtoMapper.toAdminRouteSummaryResponse(routeWithNullCategory);
        assertEquals("MICRO", admin2.getCategory());

        // 2. RouteSummaryResponse
        var summary1 = DtoMapper.toRouteSummaryResponse(routeWithCombi, java.util.List.of());
        assertEquals("COMBI", summary1.getCategory());
        var summary2 = DtoMapper.toRouteSummaryResponse(routeWithNullCategory, java.util.List.of());
        assertEquals("MICRO", summary2.getCategory());

        // 3. RouteDetailResponse
        var detail1 = DtoMapper.toRouteDetailResponse(routeWithCombi, java.util.List.of());
        assertEquals("COMBI", detail1.getCategory());
        var detail2 = DtoMapper.toRouteDetailResponse(routeWithNullCategory, java.util.List.of());
        assertEquals("MICRO", detail2.getCategory());

        // 4. PopularRouteResponse
        var popular1 = DtoMapper.toPopularRouteResponse(routeWithCombi, 5);
        assertEquals("COMBI", popular1.getCategory());
        var popular2 = DtoMapper.toPopularRouteResponse(routeWithNullCategory, 5);
        assertEquals("MICRO", popular2.getCategory());
    }
}
