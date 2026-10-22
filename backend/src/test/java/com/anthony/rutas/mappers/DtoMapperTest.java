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
}
