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
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

import java.util.List;
import java.util.Properties;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class QrCodeRepositoryTest {

    private static final List<String> BLOCKING_STATUSES = List.of("ACTIVE", "PAUSED");

    private EntityManagerFactory entityManagerFactory;
    private EntityManager entityManager;
    private QrCodeRepository repository;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.h2.Driver");
        dataSource.setUrl("jdbc:h2:mem:qr-codes-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        dataSource.setUsername("sa");
        dataSource.setPassword("");

        LocalContainerEntityManagerFactoryBean factoryBean = new LocalContainerEntityManagerFactoryBean();
        factoryBean.setDataSource(dataSource);
        factoryBean.setPersistenceUnitName("qr-code-repository-test");
        factoryBean.setManagedTypes(PersistenceManagedTypes.of(
                QrCode.class.getName(),
                Operator.class.getName(),
                City.class.getName(),
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
        repository = new JpaRepositoryFactory(entityManager).getRepository(QrCodeRepository.class);
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
    void countsOnlyActiveAndPausedStopQrsForRequestedStop() {
        UUID stopId = UUID.randomUUID();
        persist(qr("ACTIVE", "STOP", stopId));
        persist(qr("PAUSED", "STOP", stopId));
        persist(qr("ACTIVE", "ROUTE", stopId));
        persist(qr("ACTIVE", "STOP", UUID.randomUUID()));
        persist(qr("REVOKED", "STOP", stopId));

        long count = repository.countByTargetTypeAndTargetIdAndStatusIn("STOP", stopId, BLOCKING_STATUSES);

        assertThat(count).isEqualTo(2);
    }

    private void persist(QrCode qrCode) {
        entityManager.getTransaction().begin();
        entityManager.persist(qrCode);
        entityManager.getTransaction().commit();
        entityManager.clear();
    }

    private QrCode qr(String status, String targetType, UUID targetId) {
        return QrCode.builder()
                .code(UUID.randomUUID().toString().substring(0, 12))
                .label("QR " + status)
                .targetType(targetType)
                .targetId(targetId)
                .status(status)
                .build();
    }
}
