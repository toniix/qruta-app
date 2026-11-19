package com.anthony.rutas.config;

import com.anthony.rutas.services.RouteAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Lets the aggregation job run as a one-shot command ({@code java -jar ... --app.analytics.run-aggregation=true})
 * in addition to its HTTP endpoint, so the platform can choose between Cloud Scheduler and
 * a local cron without an embedded scheduler.
 */
@Configuration
@RequiredArgsConstructor
public class AnalyticsAggregationJobConfig {

    @Bean
    @ConditionalOnProperty(name = "app.analytics.run-aggregation", havingValue = "true")
    public ApplicationRunner analyticsAggregationRunner(RouteAnalyticsService routeAnalyticsService) {
        return args -> routeAnalyticsService.aggregatePreviousDay();
    }
}
