package com.anthony.rutas.repositories;

import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.QrCode;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.RouteDirection;
import com.anthony.rutas.entities.RoutePoint;
import com.anthony.rutas.entities.RouteStop;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.entities.TransportLine;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

import java.util.List;
import java.util.Properties;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the JPA mapping generates the same uniqueness rules as the
 * Flyway migration, so local development (ddl-auto=update) and production
 * (Flyway + ddl-auto=validate) do not diverge.
 */
class RouteGeometryConstraintsTest {

    private EntityManagerFactory entityManagerFactory;
    private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.h2.Driver");
        dataSource.setUrl("jdbc:h2:mem:route-geometry-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        dataSource.setUsername("sa");
        dataSource.setPassword("");

        LocalContainerEntityManagerFactoryBean factoryBean = new LocalContainerEntityManagerFactoryBean();
        factoryBean.setDataSource(dataSource);
        factoryBean.setPersistenceUnitName("route-geometry-constraints-test");
        factoryBean.setManagedTypes(PersistenceManagedTypes.of(
                City.class.getName(),
                Operator.class.getName(),
                Stop.class.getName(),
                TransportLine.class.getName(),
                Route.class.getName(),
                RouteDirection.class.getName(),
                RouteStop.class.getName(),
                RoutePoint.class.getName(),
                QrCode.class.getName()));
        factoryBean.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties properties = new Properties();
        properties.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        properties.setProperty("hibernate.dialect", "org.hibernate.dialect.H2Dialect");
        properties.setProperty("hibernate.show_sql", "false");
        factoryBean.setJpaProperties(properties);
        factoryBean.afterPropertiesSet();

        entityManagerFactory = factoryBean.getObject();
        entityManager = entityManagerFactory.createEntityManager();
    }

    @AfterEach
    void tearDown() {
        if (entityManager != null && entityManager.isOpen()) {
            entityManager.close();
        }
        if (entityManagerFactory != null && entityManagerFactory.isOpen()) {
            entityManagerFactory.close();
        }
    }

    @Test
    void generatesExpectedUniqueConstraints() {
        List<?> rows = entityManager.createNativeQuery(
                        "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_TYPE = 'UNIQUE'")
                .getResultList();
        List<String> names = rows.stream()
                .map(row -> String.valueOf(row).toLowerCase())
                .collect(Collectors.toList());

        assertThat(names).contains(
                "uk_route_stops_direction_stop".toLowerCase(),
                "uk_route_stops_direction_order".toLowerCase(),
                "uk_route_points_direction_order".toLowerCase(),
                "uk_route_directions_route_direction".toLowerCase());
    }

    @Test
    void routePointLocationIsNotNull() {
        @SuppressWarnings("unchecked")
        List<Object[]> columns = entityManager.createNativeQuery(
                        "SELECT TABLE_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS " +
                                "WHERE TABLE_NAME = 'ROUTE_POINTS' AND COLUMN_NAME = 'LOCATION'")
                .getResultList();

        assertThat(columns).hasSize(1);
        assertThat(String.valueOf(columns.get(0)[1])).isEqualToIgnoringCase("NO");
    }
}
