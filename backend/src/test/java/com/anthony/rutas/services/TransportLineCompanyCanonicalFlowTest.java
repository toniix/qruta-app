package com.anthony.rutas.services;

import com.anthony.rutas.billing.BillingService;
import com.anthony.rutas.billing.SubscriptionAccessService;
import com.anthony.rutas.dtos.request.CreateOperatorRequest;
import com.anthony.rutas.dtos.request.CreateTransportLineRequest;
import com.anthony.rutas.dtos.request.UpdateTransportLineRequest;
import com.anthony.rutas.dtos.response.OperatorLineResponse;
import com.anthony.rutas.dtos.response.OperatorResponse;
import com.anthony.rutas.dtos.response.OperatorRouteResponse;
import com.anthony.rutas.dtos.response.TransportLineResponse;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.OperatorUser;
import com.anthony.rutas.entities.Route;
import com.anthony.rutas.entities.TransportLine;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.CommunityPostRepository;
import com.anthony.rutas.repositories.DisruptionRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.OperatorUserRepository;
import com.anthony.rutas.repositories.RouteDailyStatRepository;
import com.anthony.rutas.repositories.RouteRepository;
import com.anthony.rutas.repositories.StopRepository;
import com.anthony.rutas.repositories.TransportLineRepository;
import com.anthony.rutas.security.OperatorPrincipal;
import com.anthony.rutas.security.OperatorScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.GeometryFactory;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

/**
 * End-to-end integration flow verifying task 4.3 happy path and constraints:
 * 1. Admin creates a line with company only.
 * 2. Admin creates an operator from that line; operator.name is derived from line.company.
 * 3. Operator portal displays line and route using the company identity.
 * 4. Admin renames the company; linked operator name is automatically updated.
 * 5. Attempt duplicate company in same city is rejected.
 * 6. Clean up temporary records.
 */
@ExtendWith(MockitoExtension.class)
class TransportLineCompanyCanonicalFlowTest {

    @Mock
    private TransportLineRepository transportLineRepository;
    @Mock
    private CityRepository cityRepository;
    @Mock
    private OperatorRepository operatorRepository;
    @Mock
    private OperatorUserRepository operatorUserRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private RouteRepository routeRepository;
    @Mock
    private StopRepository stopRepository;
    @Mock
    private DisruptionRepository disruptionRepository;
    @Mock
    private CommunityPostRepository communityPostRepository;
    @Mock
    private RouteDailyStatRepository routeDailyStatRepository;
    @Mock
    private BillingService billingService;
    @Mock
    private SubscriptionAccessService subscriptionAccessService;
    @Mock
    private ChangeLogService changeLogService;
    @Mock
    private RouteService routeService;
    @Mock
    private RouteAnalyticsService routeAnalyticsService;
    @Mock
    private GeometryFactory geometryFactory;

    private final Map<UUID, City> cityStore = new HashMap<>();
    private final Map<UUID, TransportLine> lineStore = new HashMap<>();
    private final Map<UUID, Operator> operatorStore = new HashMap<>();
    private final Map<UUID, OperatorUser> userStore = new HashMap<>();
    private final Map<UUID, Route> routeStore = new HashMap<>();

    private TransportLineService transportLineService;
    private AdminOperatorService adminOperatorService;
    private OperatorPortalService operatorPortalService;

    private City testCity;

    @BeforeEach
    void setUp() {
        cityStore.clear();
        lineStore.clear();
        operatorStore.clear();
        userStore.clear();
        routeStore.clear();

        testCity = City.builder()
                .id(UUID.randomUUID())
                .name("Huancayo")
                .department("Junin")
                .country("Peru")
                .build();
        cityStore.put(testCity.getId(), testCity);

        lenient().when(cityRepository.findById(any())).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            return Optional.ofNullable(cityStore.get(id));
        });

        lenient().when(transportLineRepository.save(any(TransportLine.class))).thenAnswer(inv -> {
            TransportLine line = inv.getArgument(0);
            if (line.getId() == null) {
                line.setId(UUID.randomUUID());
            }
            lineStore.put(line.getId(), line);
            return line;
        });

        lenient().when(transportLineRepository.findById(any())).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            return Optional.ofNullable(lineStore.get(id));
        });

        lenient().when(transportLineRepository.findByCityIdWithCity(any())).thenAnswer(inv -> {
            UUID cityId = inv.getArgument(0);
            List<TransportLine> lines = new ArrayList<>();
            for (TransportLine l : lineStore.values()) {
                if (l.getCity() != null && cityId.equals(l.getCity().getId())) {
                    lines.add(l);
                }
            }
            return lines;
        });

        lenient().when(transportLineRepository.findByOperatorId(any())).thenAnswer(inv -> {
            UUID opId = inv.getArgument(0);
            List<TransportLine> lines = new ArrayList<>();
            for (TransportLine l : lineStore.values()) {
                if (l.getOperator() != null && opId.equals(l.getOperator().getId())) {
                    lines.add(l);
                }
            }
            return lines;
        });

        lenient().when(operatorRepository.save(any(Operator.class))).thenAnswer(inv -> {
            Operator op = inv.getArgument(0);
            if (op.getId() == null) {
                op.setId(UUID.randomUUID());
            }
            operatorStore.put(op.getId(), op);
            return op;
        });

        lenient().when(operatorRepository.findById(any())).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            return Optional.ofNullable(operatorStore.get(id));
        });

        lenient().when(operatorUserRepository.save(any(OperatorUser.class))).thenAnswer(inv -> {
            OperatorUser u = inv.getArgument(0);
            if (u.getId() == null) {
                u.setId(UUID.randomUUID());
            }
            userStore.put(u.getId(), u);
            return u;
        });

        lenient().when(routeRepository.findByOperatorId(any())).thenAnswer(inv -> {
            UUID opId = inv.getArgument(0);
            List<Route> routes = new ArrayList<>();
            for (Route r : routeStore.values()) {
                if (r.getTransportLine() != null && r.getTransportLine().getOperator() != null
                        && opId.equals(r.getTransportLine().getOperator().getId())) {
                    routes.add(r);
                }
            }
            return routes;
        });

        lenient().when(routeRepository.findByTransportLineIdWithLine(any())).thenAnswer(inv -> {
            UUID lineId = inv.getArgument(0);
            List<Route> routes = new ArrayList<>();
            for (Route r : routeStore.values()) {
                if (r.getTransportLine() != null && lineId.equals(r.getTransportLine().getId())) {
                    routes.add(r);
                }
            }
            return routes;
        });

        lenient().when(passwordEncoder.encode(any())).thenReturn("hashed-secret");

        transportLineService = new TransportLineService(
                transportLineRepository, cityRepository, operatorRepository,
                communityPostRepository, disruptionRepository);
        adminOperatorService = new AdminOperatorService(
                operatorRepository,
                operatorUserRepository,
                cityRepository,
                transportLineRepository,
                passwordEncoder
        );
        operatorPortalService = new OperatorPortalService(
                new OperatorScope(),
                subscriptionAccessService,
                billingService,
                changeLogService,
                operatorRepository,
                transportLineRepository,
                routeRepository,
                stopRepository,
                disruptionRepository,
                communityPostRepository,
                routeService,
                routeDailyStatRepository,
                routeAnalyticsService,
                geometryFactory
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        cityStore.clear();
        lineStore.clear();
        operatorStore.clear();
        userStore.clear();
        routeStore.clear();
    }

    @Test
    @DisplayName("Task 4.3 Happy Path: Line company-only -> Operator derived name -> Portal displays -> Admin rename sync -> Duplicate rejection -> Cleanup")
    void fullHappyPathAndConstraintsLifecycle() {
        // Step 1: Create a line with company only (no name/code)
        CreateTransportLineRequest lineReq = CreateTransportLineRequest.builder()
                .company("Empresa Santa Rosa S.A.")
                .cityId(testCity.getId().toString())
                .status("ACTIVE")
                .build();
        TransportLineResponse createdLine = transportLineService.create(lineReq);

        assertThat(createdLine.getId()).isNotNull();
        assertThat(createdLine.getCompany()).isEqualTo("Empresa Santa Rosa S.A.");
        TransportLine storedLine = lineStore.get(createdLine.getId());
        assertThat(storedLine.getCompany()).isEqualTo("Empresa Santa Rosa S.A.");
        assertThat(storedLine.getOperator()).isNull();

        // Step 2: Create an operator from that line
        CreateOperatorRequest opReq = CreateOperatorRequest.builder()
                .transportLineId(createdLine.getId().toString())
                .cityId(testCity.getId().toString())
                .ruc("20123456789")
                .contactName("Admin Santa Rosa")
                .contactEmail("admin@santarosa.com")
                .contactPhone("987654321")
                .plan("BASIC")
                .build();
        OperatorResponse createdOp = adminOperatorService.create(opReq);

        assertThat(createdOp.getId()).isNotNull();
        assertThat(createdOp.getName()).isEqualTo("Empresa Santa Rosa S.A."); // Derived from line.company
        Operator storedOp = operatorStore.get(createdOp.getId());
        assertThat(storedOp.getName()).isEqualTo("Empresa Santa Rosa S.A.");
        assertThat(storedLine.getOperator()).isNotNull();
        assertThat(storedLine.getOperator().getId()).isEqualTo(createdOp.getId());

        // Attach a route to the line to verify portal route display
        Route testRoute = Route.builder()
                .id(UUID.randomUUID())
                .code("SR-01")
                .name("Ruta 1 Santa Rosa")
                .transportLine(storedLine)
                .status("ACTIVE")
                .build();
        routeStore.put(testRoute.getId(), testRoute);

        // Step 3: Operator portal login and query: lines and routes reflect the company identity
        OperatorPrincipal principal = mock(OperatorPrincipal.class);
        lenient().when(principal.getOperatorId()).thenReturn(createdOp.getId());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_OPERATOR"))
                )
        );

        List<OperatorLineResponse> portalLines = operatorPortalService.getLines();
        assertThat(portalLines).hasSize(1);
        assertThat(portalLines.get(0).getCompany()).isEqualTo("Empresa Santa Rosa S.A.");

        List<OperatorRouteResponse> portalRoutes = operatorPortalService.getRoutes();
        assertThat(portalRoutes).hasSize(1);
        assertThat(portalRoutes.get(0).getTransportLineName()).isEqualTo("Empresa Santa Rosa S.A.");

        // Step 4: Admin renames the company; linked operator name follows
        UpdateTransportLineRequest updateReq = UpdateTransportLineRequest.builder()
                .company("Empresa Santa Rosa Express S.A.C.")
                .status("ACTIVE")
                .build();
        TransportLineResponse updatedLine = transportLineService.update(createdLine.getId(), updateReq);

        assertThat(updatedLine.getCompany()).isEqualTo("Empresa Santa Rosa Express S.A.C.");
        assertThat(storedLine.getCompany()).isEqualTo("Empresa Santa Rosa Express S.A.C.");
        assertThat(storedOp.getName()).isEqualTo("Empresa Santa Rosa Express S.A.C."); // Operator followed

        // Step 5: Duplicate company in the same city is rejected
        CreateTransportLineRequest duplicateReq = CreateTransportLineRequest.builder()
                .company("  empresa santa rosa express s.a.c.  ")
                .cityId(testCity.getId().toString())
                .status("ACTIVE")
                .build();
        assertThatThrownBy(() -> transportLineService.create(duplicateReq))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already exists for company")
                .hasMessageContaining("in this city");

        // Step 6: Clean up all temporary records
        cityStore.clear();
        lineStore.clear();
        operatorStore.clear();
        userStore.clear();
        routeStore.clear();

        assertThat(lineStore).isEmpty();
        assertThat(operatorStore).isEmpty();
        assertThat(userStore).isEmpty();
        assertThat(routeStore).isEmpty();
        assertThat(cityStore).isEmpty();
    }
}
