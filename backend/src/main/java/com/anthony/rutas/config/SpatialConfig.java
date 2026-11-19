package com.anthony.rutas.config;

import org.locationtech.jts.geom.GeometryFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for spatial and geometric beans.
 *
 * <p>Provides a shared {@link GeometryFactory} managed by Spring to support
 * spatial operations and coordinate conversions across services.
 */
@Configuration
public class SpatialConfig {

    @Bean
    public GeometryFactory geometryFactory() {
        return new GeometryFactory();
    }
}

