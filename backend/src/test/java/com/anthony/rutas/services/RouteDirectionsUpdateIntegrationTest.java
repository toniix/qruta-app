package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateRouteRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.dtos.response.RouteDetailResponse;
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
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
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
    private RouteRepository routeRepository;
    private RouteDirectionRepository directionRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

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
        routeRepository = factory.getRepository(RouteRepository.class);
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

    @Test
    void createReturnsPopulatedStopsAndRoutePointsInSameTransaction() {
        entityManager.getTransaction().begin();
        City city = City.builder().name("Ica").department("Ica").country("PE").build();
        entityManager.persist(city);
        TransportLine line = TransportLine.builder().city(city).company("Linea 1").status("ACTIVE").build();
        entityManager.persist(line);
        Stop stop = Stop.builder()
                .city(city)
                .name("Terminal")
                .slug("terminal-ica")
                .location(geometryFactory.createPoint(new Coordinate(-75.72, -14.06)))
                .build();
        entityManager.persist(stop);
        entityManager.flush();

        CreateRouteRequest request = CreateRouteRequest.builder()
                .transportLineId(line.getId().toString())
                .code("R-CREATE")
                .name("Ruta Create")
                .directions(List.of(CreateRouteRequest.RouteDirectionRequest.builder()
                        .direction("IDA")
                        .originName("A")
                        .destinationName("B")
                        .stops(List.of(CreateRouteRequest.RouteStopItemRequest.builder()
                                .stopId(stop.getId().toString())
                                .stopOrder(1)
                                .distanceFromStart(0.0)
                                .build()))
                        .routePoints(List.of(
                                CreateRouteRequest.RoutePointItemRequest.builder()
                                        .pointOrder(1).latitude(-14.06).longitude(-75.72).build(),
                                CreateRouteRequest.RoutePointItemRequest.builder()
                                        .pointOrder(2).latitude(-14.07).longitude(-75.73).build()))
                        .build()))
                .build();

        RouteDetailResponse response = routeService.create(request);
        entityManager.flush();

        assertEquals(1, response.getDirections().size());
        assertEquals(1, response.getDirections().get(0).getStops().size());
        assertEquals(2, response.getDirections().get(0).getRoutePoints().size());
        assertEquals(List.of(-14.06, -75.72), response.getDirections().get(0).getRoutePoints().get(0));
        assertEquals(List.of(-14.07, -75.73), response.getDirections().get(0).getRoutePoints().get(1));
        entityManager.getTransaction().rollback();
    }

    @Test
    void updateDirectionsWithInitializedRouteDirectionsDoesNotFailOnFlushAndReturnsGeometry() {
        entityManager.getTransaction().begin();
        City city = City.builder().name("Ica").department("Ica").country("PE").build();
        entityManager.persist(city);
        TransportLine line = TransportLine.builder().city(city).company("Linea 1").status("ACTIVE").build();
        entityManager.persist(line);
        Stop stop = Stop.builder()
                .city(city)
                .name("Plaza")
                .slug("plaza-ica")
                .location(geometryFactory.createPoint(new Coordinate(-75.72, -14.06)))
                .build();
        entityManager.persist(stop);
        Route route = Route.builder().transportLine(line).code("R-OP").name("Ruta Op")
                .status("ACTIVE").category("MICRO").build();
        entityManager.persist(route);
        RouteDirection existing = RouteDirection.builder().route(route).direction("IDA").build();
        entityManager.persist(existing);
        RoutePoint existingPoint = RoutePoint.builder()
                .direction(existing)
                .pointOrder(1)
                .location(geometryFactory.createPoint(new Coordinate(-75.70, -14.05)))
                .build();
        entityManager.persist(existingPoint);
        entityManager.flush();
        entityManager.clear();

        // Simulate OperatorPortalService: load Route and initialize route.getDirections()
        Route loadedRoute = routeRepository.findById(route.getId()).orElseThrow();
        assertEquals(1, loadedRoute.getDirections().size());

        // Omit routePoints (null) to preserve stored geometry while adding a stop
        UpdateRouteDirectionsRequest request = UpdateRouteDirectionsRequest.builder()
                .directions(List.of(UpdateRouteDirectionsRequest.DirectionUpdateRequest.builder()
                        .id(existing.getId().toString())
                        .direction("IDA")
                        .stops(List.of(UpdateRouteDirectionsRequest.StopUpdateRequest.builder()
                                .stopId(stop.getId().toString())
                                .stopOrder(1)
                                .distanceFromStart(0.0)
                                .build()))
                        .routePoints(null)
                        .build()))
                .build();

        RouteDetailResponse response = routeService.updateDirections(route.getId(), request);
        entityManager.flush();

        assertEquals(1, response.getDirections().size());
        assertEquals(1, response.getDirections().get(0).getStops().size());
        assertEquals(1, response.getDirections().get(0).getRoutePoints().size());
        assertEquals(List.of(-14.05, -75.70), response.getDirections().get(0).getRoutePoints().get(0));
        entityManager.getTransaction().rollback();
    }
}
