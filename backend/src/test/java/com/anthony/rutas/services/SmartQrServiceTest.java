package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateQrCodeRequest;
import com.anthony.rutas.dtos.request.UpdateQrCodeRequest;
import com.anthony.rutas.dtos.response.QrCodeResponse;
import com.anthony.rutas.dtos.response.QrCodeStatsResponse;
import com.anthony.rutas.entities.*;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SmartQrServiceTest {

    @Mock
    private QrCodeRepository qrCodeRepository;

    @Mock
    private RouteRepository routeRepository;

    @Mock
    private StopRepository stopRepository;

    @Mock
    private OperatorRepository operatorRepository;

    @Mock
    private RouteEventRepository routeEventRepository;

    @Mock
    private DeviceHasher deviceHasher;

    private SmartQrService service;

    @BeforeEach
    void setUp() {
        service = new SmartQrService(
                qrCodeRepository,
                routeRepository,
                stopRepository,
                operatorRepository,
                routeEventRepository,
                deviceHasher
        );
    }

    @Test
    void generateUniqueCodeGeneratesAlphanumericToken() {
        when(qrCodeRepository.existsByCode(anyString())).thenReturn(false);

        String code = service.generateUniqueCode();

        assertThat(code).isNotNull().hasSize(8).matches("[2-9A-HJ-NP-Za-km-z]+");
    }

    @Test
    void createForAdminSavesValidRouteQrCode() {
        UUID routeId = UUID.randomUUID();
        when(qrCodeRepository.existsByCode(anyString())).thenReturn(false);
        when(routeRepository.existsById(routeId)).thenReturn(true);
        when(routeRepository.findById(routeId)).thenReturn(Optional.of(Route.builder().id(routeId).name("Línea 10").code("L10").build()));

        when(qrCodeRepository.save(any(QrCode.class))).thenAnswer(invocation -> {
            QrCode saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setCreatedAt(Instant.now());
            saved.setUpdatedAt(Instant.now());
            return saved;
        });

        CreateQrCodeRequest req = CreateQrCodeRequest.builder()
                .label("Afiche Paradero 1")
                .targetType("ROUTE")
                .targetId(routeId)
                .campaignSource("afiche_plaza")
                .campaignMedium("print")
                .campaignName("verano_2026")
                .build();

        QrCodeResponse res = service.createForAdmin(req);

        assertThat(res).isNotNull();
        assertThat(res.getLabel()).isEqualTo("Afiche Paradero 1");
        assertThat(res.getTargetType()).isEqualTo("ROUTE");
        assertThat(res.getTargetTitle()).isEqualTo("L10 - Línea 10");
        assertThat(res.getTargetUrl()).contains("https://front.anthonywar.dev/mapa/ruta/L10");
        assertThat(res.getTargetUrl()).contains("utm_source=afiche_plaza");
        assertThat(res.getTargetUrl()).contains("utm_campaign=verano_2026");
    }

    @Test
    void createForOperatorFailsWhenTargetRouteBelongsToAnotherOperator() {
        UUID operatorIdA = UUID.randomUUID();
        UUID operatorIdB = UUID.randomUUID();
        UUID routeId = UUID.randomUUID();

        Operator opB = Operator.builder().id(operatorIdB).name("Transportes B").build();
        TransportLine lineB = TransportLine.builder().id(UUID.randomUUID()).operator(opB).build();
        Route routeB = Route.builder().id(routeId).transportLine(lineB).build();

        when(routeRepository.findById(routeId)).thenReturn(Optional.of(routeB));

        CreateQrCodeRequest req = CreateQrCodeRequest.builder()
                .label("QR Intrusivo")
                .targetType("ROUTE")
                .targetId(routeId)
                .build();

        assertThatThrownBy(() -> service.createForOperator(operatorIdA, req))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("does not belong to this operator");
    }

    @Test
    void createForOperatorFailsWhenTargetStopBelongsToAnotherCity() {
        UUID operatorId = UUID.randomUUID();
        UUID stopId = UUID.randomUUID();
        City ica = City.builder().id(UUID.randomUUID()).name("Ica").build();
        City lima = City.builder().id(UUID.randomUUID()).name("Lima").build();
        Operator operator = Operator.builder().id(operatorId).name("Transportes Ica").city(ica).build();
        Stop foreignStop = Stop.builder().id(stopId).name("Paradero Lima").city(lima).build();

        when(operatorRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(stopRepository.findById(stopId)).thenReturn(Optional.of(foreignStop));

        CreateQrCodeRequest req = CreateQrCodeRequest.builder()
                .label("QR Paradero Ajeno")
                .targetType("STOP")
                .targetId(stopId)
                .build();

        assertThatThrownBy(() -> service.createForOperator(operatorId, req))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("city");
    }

    @Test
    void updateStatusRetargetsRouteAndKeepsCodeAndCanonicalUrl() {
        UUID qrId = UUID.randomUUID();
        UUID oldRouteId = UUID.randomUUID();
        UUID newRouteId = UUID.randomUUID();
        QrCode qr = QrCode.builder()
                .id(qrId)
                .code("stableCode")
                .label("Afiche Paradero 1")
                .status("ACTIVE")
                .targetType("ROUTE")
                .targetId(oldRouteId)
                .build();

        when(qrCodeRepository.findById(qrId)).thenReturn(Optional.of(qr));
        when(routeRepository.existsById(newRouteId)).thenReturn(true);
        when(routeRepository.findById(newRouteId)).thenReturn(Optional.of(
                Route.builder().id(newRouteId).code("L20").name("Línea 20").build()));
        when(routeEventRepository.countByQrCodeIdAndCategory(qrId, EventCategory.QR_SCAN)).thenReturn(0L);
        when(qrCodeRepository.save(any(QrCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QrCodeResponse res = service.updateStatus(qrId, UpdateQrCodeRequest.builder()
                .targetType("ROUTE")
                .targetId(newRouteId)
                .build());

        assertThat(res.getCode()).isEqualTo("stableCode");
        assertThat(res.getTargetId()).isEqualTo(newRouteId);
        assertThat(res.getCanonicalUrl()).endsWith("/q/stableCode");
        assertThat(res.getTargetUrl()).contains("/mapa/ruta/L20");
    }

    @Test
    void updateStatusRejectsRetargetToMissingRoute() {
        UUID qrId = UUID.randomUUID();
        UUID oldRouteId = UUID.randomUUID();
        UUID missingRouteId = UUID.randomUUID();
        QrCode qr = QrCode.builder()
                .id(qrId)
                .code("stableCode")
                .label("Afiche Paradero 1")
                .status("ACTIVE")
                .targetType("ROUTE")
                .targetId(oldRouteId)
                .build();

        when(qrCodeRepository.findById(qrId)).thenReturn(Optional.of(qr));
        when(routeRepository.existsById(missingRouteId)).thenReturn(false);

        assertThatThrownBy(() -> service.updateStatus(qrId, UpdateQrCodeRequest.builder()
                .targetType("ROUTE")
                .targetId(missingRouteId)
                .build()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Route not found");

        verify(qrCodeRepository, never()).save(any(QrCode.class));
    }

    @Test
    void deleteRemovesQrFromListingsAndDetailWhileRouteEventsRemain() {
        UUID qrId = UUID.randomUUID();
        QrCode qr = QrCode.builder()
                .id(qrId)
                .code("deletedCode")
                .label("Afiche eliminado")
                .status("ACTIVE")
                .targetType("HOME")
                .build();

        when(qrCodeRepository.findById(qrId)).thenReturn(Optional.of(qr));
        service.delete(qrId);

        verify(qrCodeRepository).delete(qr);
        verifyNoInteractions(routeEventRepository);

        when(qrCodeRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());
        assertThat(service.listAll()).isEmpty();

        when(qrCodeRepository.findById(qrId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getById(qrId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("QR Code not found");
    }

    @Test
    void resolveAndTrackLogsScanAndReturnsCanonicalRedirectForActiveQr() {
        UUID routeId = UUID.randomUUID();
        UUID qrId = UUID.randomUUID();
        QrCode qr = QrCode.builder()
                .id(qrId)
                .code("code1234")
                .status("ACTIVE")
                .targetType("ROUTE")
                .targetId(routeId)
                .campaignSource("afiche")
                .build();

        when(qrCodeRepository.findByCode("code1234")).thenReturn(Optional.of(qr));
        when(routeRepository.findById(routeId)).thenReturn(Optional.of(Route.builder().id(routeId).code("L10").name("Línea 10").build()));
        when(deviceHasher.hash(anyString(), any(Instant.class))).thenReturn("hashed_device_123");

        SmartQrService.ResolvedRedirect redirect = service.resolveAndTrack("code1234", "192.168.1.1|Mozilla");

        assertThat(redirect.active()).isTrue();
        assertThat(redirect.redirectUrl()).startsWith("https://front.anthonywar.dev/mapa/ruta/L10");
        assertThat(redirect.redirectUrl()).contains("qr=code1234");

        ArgumentCaptor<RouteEvent> eventCaptor = ArgumentCaptor.forClass(RouteEvent.class);
        verify(routeEventRepository).save(eventCaptor.capture());
        RouteEvent event = eventCaptor.getValue();
        assertThat(event.getCategory()).isEqualTo(EventCategory.QR_SCAN);
        assertThat(event.getQrCodeId()).isEqualTo(qrId);
        assertThat(event.getRouteId()).isEqualTo(routeId);
        assertThat(event.getCampaign()).isEqualTo("afiche");
        assertThat(event.getDeviceHash()).isEqualTo("hashed_device_123");
    }

    @Test
    void resolveAndTrackRedirectsToFallbackForPausedQr() {
        QrCode qr = QrCode.builder()
                .id(UUID.randomUUID())
                .code("pausedCode")
                .status("PAUSED")
                .targetType("HOME")
                .build();

        when(qrCodeRepository.findByCode("pausedCode")).thenReturn(Optional.of(qr));
        when(deviceHasher.hash(anyString(), any(Instant.class))).thenReturn("hashed_device_456");

        SmartQrService.ResolvedRedirect redirect = service.resolveAndTrack("pausedCode", "10.0.0.1|Safari");

        assertThat(redirect.active()).isFalse();
        assertThat(redirect.redirectUrl()).isEqualTo("https://front.anthonywar.dev/?qr_error=inactive");

        ArgumentCaptor<RouteEvent> eventCaptor = ArgumentCaptor.forClass(RouteEvent.class);
        verify(routeEventRepository).save(eventCaptor.capture());
        RouteEvent event = eventCaptor.getValue();
        assertThat(event.getCategory()).isEqualTo(EventCategory.QR_REDIRECT_FAILED);
        assertThat(event.getCampaign()).isEqualTo("pausedCode");
    }

    @Test
    void resolveAndTrackReturnsNotFoundForDeletedCode() {
        when(qrCodeRepository.findByCode("missingCode")).thenReturn(Optional.empty());
        when(deviceHasher.hash(anyString(), any(Instant.class))).thenReturn("hashed_device_missing");

        SmartQrService.ResolvedRedirect redirect = service.resolveAndTrack("missingCode", "10.0.0.2|Chrome");

        assertThat(redirect.active()).isFalse();
        assertThat(redirect.redirectUrl()).endsWith("/?qr_error=not_found");

        ArgumentCaptor<RouteEvent> eventCaptor = ArgumentCaptor.forClass(RouteEvent.class);
        verify(routeEventRepository).save(eventCaptor.capture());
        RouteEvent event = eventCaptor.getValue();
        assertThat(event.getCategory()).isEqualTo(EventCategory.QR_REDIRECT_FAILED);
        assertThat(event.getCampaign()).isEqualTo("missingCode");
        assertThat(event.getQrCodeId()).isNull();
    }

    @Test
    void resolveAndTrackReturnsTargetMissingForActiveQrWithMissingRoute() {
        UUID routeId = UUID.randomUUID();
        UUID qrId = UUID.randomUUID();
        QrCode qr = QrCode.builder()
                .id(qrId)
                .code("staleRoute")
                .status("ACTIVE")
                .targetType("ROUTE")
                .targetId(routeId)
                .build();

        when(qrCodeRepository.findByCode("staleRoute")).thenReturn(Optional.of(qr));
        when(routeRepository.findById(routeId)).thenReturn(Optional.empty());
        when(deviceHasher.hash(anyString(), any(Instant.class))).thenReturn("hashed_device_stale");

        SmartQrService.ResolvedRedirect redirect = service.resolveAndTrack("staleRoute", "10.0.0.3|Safari");

        assertThat(redirect.active()).isFalse();
        assertThat(redirect.redirectUrl()).endsWith("/?qr_error=target_missing");

        ArgumentCaptor<RouteEvent> eventCaptor = ArgumentCaptor.forClass(RouteEvent.class);
        verify(routeEventRepository).save(eventCaptor.capture());
        RouteEvent event = eventCaptor.getValue();
        assertThat(event.getCategory()).isEqualTo(EventCategory.QR_REDIRECT_FAILED);
        assertThat(event.getQrCodeId()).isEqualTo(qrId);
        assertThat(event.getRouteId()).isEqualTo(routeId);
    }

    @Test
    void resolveAndTrackRedirectsToStopPageForStopQr() {
        UUID stopId = UUID.randomUUID();
        UUID qrId = UUID.randomUUID();
        QrCode qr = QrCode.builder()
                .id(qrId)
                .code("stopCode1")
                .status("ACTIVE")
                .targetType("STOP")
                .targetId(stopId)
                .build();

        Stop stop = Stop.builder().id(stopId).name("Paradero Central").build();
        when(qrCodeRepository.findByCode("stopCode1")).thenReturn(Optional.of(qr));
        when(stopRepository.findById(stopId)).thenReturn(Optional.of(stop));
        when(deviceHasher.hash(anyString(), any(Instant.class))).thenReturn("hashed_device_789");

        SmartQrService.ResolvedRedirect redirect = service.resolveAndTrack("stopCode1", "127.0.0.1|Chrome");

        assertThat(redirect.active()).isTrue();
        assertThat(redirect.redirectUrl()).startsWith("https://front.anthonywar.dev/mapa/paradero/" + stopId);
        assertThat(redirect.redirectUrl()).contains("qr=stopCode1");
        assertThat(redirect.redirectUrl()).contains("qrId=" + qrId);
    }

    @Test
    void resolveAndTrackRedirectsToStopSlugWhenStopHasSlug() {
        UUID stopId = UUID.randomUUID();
        UUID qrId = UUID.randomUUID();
        QrCode qr = QrCode.builder()
                .id(qrId)
                .code("stopCodeSlug")
                .status("ACTIVE")
                .targetType("STOP")
                .targetId(stopId)
                .build();

        Stop stop = Stop.builder().id(stopId).name("El Quinde").slug("el-quinde").build();

        when(qrCodeRepository.findByCode("stopCodeSlug")).thenReturn(Optional.of(qr));
        when(stopRepository.findById(stopId)).thenReturn(Optional.of(stop));
        when(deviceHasher.hash(anyString(), any(Instant.class))).thenReturn("hashed_device_slug");

        SmartQrService.ResolvedRedirect redirect = service.resolveAndTrack("stopCodeSlug", "127.0.0.1|Chrome");

        assertThat(redirect.active()).isTrue();
        assertThat(redirect.redirectUrl()).startsWith("https://front.anthonywar.dev/mapa/paradero/el-quinde");
        assertThat(redirect.redirectUrl()).contains("qr=stopCodeSlug");
    }

    @Test
    void getStatsComputesScansAndEffectiveViewsWithLimaTimezone() {
        UUID qrId = UUID.randomUUID();
        QrCode qr = QrCode.builder().id(qrId).code("qrStat1").label("Etiqueta").status("ACTIVE").build();

        when(qrCodeRepository.findById(qrId)).thenReturn(Optional.of(qr));
        when(routeEventRepository.countByQrCodeIdAndCategory(qrId, EventCategory.QR_SCAN)).thenReturn(42L);
        when(routeEventRepository.countByQrCodeIdAndCategoryIn(eq(qrId), anyCollection())).thenReturn(28L);

        Instant scan1 = Instant.parse("2026-11-20T10:00:00Z");
        Instant scan2 = Instant.parse("2026-11-20T15:00:00Z");
        List<RouteEvent> scanEvents = List.of(
                RouteEvent.builder().recordedAt(scan1).category(EventCategory.QR_SCAN).build(),
                RouteEvent.builder().recordedAt(scan2).category(EventCategory.QR_SCAN).build()
        );
        when(routeEventRepository.findByQrCodeIdAndCategoryOrderByRecordedAtAsc(qrId, EventCategory.QR_SCAN))
                .thenReturn(scanEvents);

        QrCodeStatsResponse stats = service.getStats(qrId);

        assertThat(stats.getTotalScans()).isEqualTo(42L);
        assertThat(stats.getEffectiveViews()).isEqualTo(28L);
        assertThat(stats.getDailyScans()).hasSize(1);
        assertThat(stats.getDailyScans().get(0).scans()).isEqualTo(2L);
    }
}
