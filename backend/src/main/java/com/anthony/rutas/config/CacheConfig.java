package com.anthony.rutas.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * Enables Spring's caching abstraction (backed by Caffeine) at the configuration
 * layer rather than on a web controller.
 */
@Configuration
@EnableCaching
public class CacheConfig {
}
