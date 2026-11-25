package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.QrCode;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.RouteDirection;
import com.anthony.rutas.entities.RoutePoint;
import com.anthony.rutas.entities.RouteStop;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.entities.TransportLine;
import com.anthony.rutas.repositories.RouteDirectionRepository;
import com.anthony.rutas.repositories.RoutePointRepository;
import com.anthony.rutas.repositories.RouteRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import com.anthony.rutas.repositories.StopRepository;
import com.anthony.rutas.repositories.TransportLineRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Reproduces the 500 on PUT /admin/routes/{id}/directions with a real
 * persistence context: replacing a direction with the same "IDA" value must
 * not collide with the UNIQUE(route_id, direction) constraint.
 */
class RouteDirectionsUpdateIntegrationTest {

    private EntityManagerFactory entityManagerFactory;
    private EntityManager entityManager;
    private RouteService routeService;
    private RouteDirectionRepository directionRepository;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.h2.Driver");
        dataSource.setUrl("jdbc:h2:mem:route-update-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        dataSource.setUsername("sa");
        dataSource.setPassword("");

        LocalContainerEntityManagerFactoryBean factoryBean = new LocalContainerEntityManagerFactoryBean();
        factoryBean.setDataSource(dataSource);
        factoryBean.setPersistenceUnitName("route-directions-update-test");
        factoryBean.setManagedTypes(PersistenceManagedTypes.of(
                City.class.getName(),
                Operator.class.getName(),
                QrCode.class.getName(),
                Stop.class.getName(),
                TransportLine.class.getName(),
                Route.class.getName(),
                RouteDirection.class.getName(),
                RouteStop.class.getName(),
                RoutePoint.class.getName()));
        factoryBean.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties properties = new Properties();
        properties.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        properties.setProperty("hibernate.dialect", "org.hibernate.dialect.H2Dialect");
        properties.setProperty("hibernate.show_sql", "false");
        factoryBean.setJpaProperties(properties);
        factoryBean.afterPropertiesSet();

        entityManagerFactory = factoryBean.getObject();
        entityManager = entityManagerFactory.createEntityManager();

        var factory = new org.springframework.data.jpa.repository.support.JpaRepositoryFactory(entityManager);
        RouteRepository routeRepository = factory.getRepository(RouteRepository.class);
        directionRepository = factory.getRepository(RouteDirectionRepository.class);
        RouteStopRepository stopLinkRepository = factory.getRepository(RouteStopRepository.class);
        RoutePointRepository pointRepository = factory.getRepository(RoutePointRepository.class);
        TransportLineRepository lineRepository = factory.getRepository(TransportLineRepository.class);
        StopRepository stopRepository = factory.getRepository(StopRepository.class);

        routeService = new RouteService(routeRepository, directionRepository, stopLinkRepository,
                pointRepository, lineRepository, stopRepository);
    }

    @AfterEach
    void tearDown() {
        if (entityManager != null && entityManager.isOpen()) entityManager.close();
        if (entityManagerFactory != null && entityManagerFactory.isOpen()) entityManagerFactory.close();
    }

    @Test
    void replacingDirectionWithSameValueDoesNotFail() {
        entityManager.getTransaction().begin();
        City city = City.builder().name("Ica").department("Ica").country("PE").build();
        entityManager.persist(city);
        TransportLine line = TransportLine.builder().city(city).company("Linea 1").status("ACTIVE").build();
        entityManager.persist(line);
        Route route = Route.builder().transportLine(line).code("R1").name("Ruta 1")
                .status("ACTIVE").category("MICRO").build();
        entityManager.persist(route);
        RouteDirection existing = RouteDirection.builder().route(route).direction("IDA").build();
        entityManager.persist(existing);
        entityManager.flush();
        entityManager.clear();

        UpdateRouteDirectionsRequest request = UpdateRouteDirectionsRequest.builder()
                .directions(List.of(UpdateRouteDirectionsRequest.DirectionUpdateRequest.builder()
                        .id(existing.getId().toString())
                        .direction("IDA")
                        .stops(List.of())
                        .routePoints(List.of())
                        .build()))
                .build();

        routeService.updateDirections(route.getId(), request);
        entityManager.flush();

        assertEquals(1, directionRepository.findByRouteId(route.getId()).size());
        entityManager.getTransaction().rollback();
    }
}
