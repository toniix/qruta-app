package com.anthony.rutas.controllers;

import com.anthony.rutas.config.SecurityConfig;
import com.anthony.rutas.dtos.request.UpdateOperatorLineRequest;
import com.anthony.rutas.dtos.request.UpdateOperatorRouteRequest;
import com.anthony.rutas.dtos.request.UpdateRouteDirectionsRequest;
import com.anthony.rutas.dtos.request.UpdateStopRequest;
import com.anthony.rutas.dtos.response.OperatorAnalyticsSummaryResponse;
import com.anthony.rutas.dtos.response.OperatorLineResponse;
import com.anthony.rutas.dtos.response.OperatorProfileResponse;
import com.anthony.rutas.dtos.response.OperatorRouteResponse;
import com.anthony.rutas.dtos.response.OperatorStopResponse;
import com.anthony.rutas.dtos.response.RouteAnalyticsSeriesResponse;
import com.anthony.rutas.dtos.response.RouteDetailResponse;
import com.anthony.rutas.dtos.response.SubscriptionResponse;
import com.anthony.rutas.security.CustomUserDetailsService;
import com.anthony.rutas.security.JwtUtil;
import com.anthony.rutas.services.OperatorPortalService;
import com.anthony.rutas.services.OperatorUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = OperatorPortalController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
@WithMockUser(roles = "OPERATOR")
class OperatorPortalControllerTest {

    private static final UUID OPERATOR_ID = UUID.randomUUID();
    private static final UUID LINE_ID = UUID.randomUUID();
    private static final UUID ROUTE_ID = UUID.randomUUID();
    private static final UUID STOP_ID = UUID.randomUUID();

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OperatorPortalService operatorPortalService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private CustomUserDetailsService userDetailsService;

    @MockBean
    private OperatorUserService operatorUserService;

    @Test
    void returnsProfileFromProfileAlias() throws Exception {
        when(operatorPortalService.getProfile()).thenReturn(OperatorProfileResponse.builder()
                .operatorId(OPERATOR_ID)
                .operatorName("Operador Ica")
                .cityName("Ica")
                .build());

        mockMvc.perform(get("/api/operator/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.operatorId").value(OPERATOR_ID.toString()))
                .andExpect(jsonPath("$.cityName").value("Ica"));

        verify(operatorPortalService).getProfile();
    }

    @Test
    void returnsSubscription() throws Exception {
        when(operatorPortalService.getSubscription()).thenReturn(SubscriptionResponse.builder()
                .plan("PRO")
                .status("ACTIVE")
                .build());

        mockMvc.perform(get("/api/operator/subscription"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan").value("PRO"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(operatorPortalService).getSubscription();
    }

    @Test
    void returnsAnalyticsSummary() throws Exception {
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 7);
        when(operatorPortalService.getAnalyticsSummary(from, to))
                .thenReturn(new OperatorAnalyticsSummaryResponse(
                        List.of(new OperatorAnalyticsSummaryResponse.LineUsage(
                                LINE_ID, "Línea 1", 3, 2, 1, 0, 0, 0, 1)),
                        List.of(),
                        List.of(),
                        List.of(new OperatorAnalyticsSummaryResponse.QrCampaignUsage("centro", 4))));

        mockMvc.perform(get("/api/operator/analytics/summary")
                        .param("from", "2026-11-01")
                        .param("to", "2026-11-07"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].lineName").value("Línea 1"))
                .andExpect(jsonPath("$.qrCampaigns[0].campaign").value("centro"))
                .andExpect(jsonPath("$.qrCampaigns[0].scans").value(4));

        verify(operatorPortalService).getAnalyticsSummary(from, to);
    }

    @Test
    void returnsRouteAnalyticsSeries() throws Exception {
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 7);
        when(operatorPortalService.getRouteAnalytics(ROUTE_ID, from, to))
                .thenReturn(new RouteAnalyticsSeriesResponse(ROUTE_ID, List.of()));

        mockMvc.perform(get("/api/operator/analytics/routes/{routeId}", ROUTE_ID)
                        .param("from", "2026-11-01")
                        .param("to", "2026-11-07"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routeId").value(ROUTE_ID.toString()));

        verify(operatorPortalService).getRouteAnalytics(ROUTE_ID, from, to);
    }

    @Test
    void updatesLineWithPut() throws Exception {
        when(operatorPortalService.updateLine(eq(LINE_ID), any(UpdateOperatorLineRequest.class)))
                .thenReturn(OperatorLineResponse.builder().id(LINE_ID).name("Línea 1").build());

        mockMvc.perform(put("/api/operator/lines/{id}", LINE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Línea 1\",\"code\":\"L1\",\"status\":\"ACTIVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Línea 1"));

        verify(operatorPortalService).updateLine(eq(LINE_ID), any(UpdateOperatorLineRequest.class));
    }

    @Test
    void returnsRouteDetail() throws Exception {
        when(operatorPortalService.getRouteById(ROUTE_ID))
                .thenReturn(RouteDetailResponse.builder().id(ROUTE_ID).name("Ruta 1").build());

        mockMvc.perform(get("/api/operator/routes/{id}", ROUTE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ROUTE_ID.toString()));

        verify(operatorPortalService).getRouteById(ROUTE_ID);
    }

    @Test
    void updatesRouteWithPut() throws Exception {
        when(operatorPortalService.updateRoute(eq(ROUTE_ID), any(UpdateOperatorRouteRequest.class)))
                .thenReturn(OperatorRouteResponse.builder().id(ROUTE_ID).name("Ruta 1").build());

        mockMvc.perform(put("/api/operator/routes/{id}", ROUTE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ruta 1\",\"code\":\"R1\",\"status\":\"ACTIVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ruta 1"));

        verify(operatorPortalService).updateRoute(eq(ROUTE_ID), any(UpdateOperatorRouteRequest.class));
    }

    @Test
    void updatesRouteDirectionsWithPut() throws Exception {
        when(operatorPortalService.updateRouteDirections(eq(ROUTE_ID), any(UpdateRouteDirectionsRequest.class)))
                .thenReturn(RouteDetailResponse.builder().id(ROUTE_ID).build());

        mockMvc.perform(put("/api/operator/routes/{id}/directions", ROUTE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"directions":[{"direction":"IDA","stops":[{"stopId":"%s","stopOrder":1}]}]}
                                """.formatted(STOP_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ROUTE_ID.toString()));

        verify(operatorPortalService).updateRouteDirections(eq(ROUTE_ID), any(UpdateRouteDirectionsRequest.class));
    }

    @Test
    void updatesStopWithPut() throws Exception {
        when(operatorPortalService.updateStop(eq(STOP_ID), any(UpdateStopRequest.class)))
                .thenReturn(OperatorStopResponse.builder()
                        .id(STOP_ID)
                        .name("Terminal")
                        .latitude(-14.1)
                        .longitude(-75.1)
                        .build());

        mockMvc.perform(put("/api/operator/stops/{id}", STOP_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Terminal\",\"latitude\":-14.1,\"longitude\":-75.1,\"isAccessible\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(-14.1))
                .andExpect(jsonPath("$.longitude").value(-75.1));

        verify(operatorPortalService).updateStop(eq(STOP_ID), any(UpdateStopRequest.class));
    }
}
