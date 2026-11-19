package com.anthony.rutas.controllers;

import com.anthony.rutas.config.SecurityConfig;
import com.anthony.rutas.dtos.request.AnalyticsEventBatchRequest;
import com.anthony.rutas.security.CustomUserDetailsService;
import com.anthony.rutas.security.JwtUtil;
import com.anthony.rutas.services.OperatorUserService;
import com.anthony.rutas.services.RouteAnalyticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AnalyticsController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RouteAnalyticsService routeAnalyticsService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private CustomUserDetailsService userDetailsService;

    @MockBean
    private OperatorUserService operatorUserService;

    @Test
    void acceptsAValidBatchWithoutAuthentication() throws Exception {
        when(routeAnalyticsService.ingest(any(AnalyticsEventBatchRequest.class))).thenReturn(2);

        mockMvc.perform(post("/api/analytics/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"events":[
                                  {"category":"route_view","routeId":"00000000-0000-0000-0000-000000000001","deviceId":"dev-1"},
                                  {"category":"qr_scan","routeId":"00000000-0000-0000-0000-000000000001","deviceId":"dev-1","campaign":"paradero-centro"}
                                ]}
                                """))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.accepted").value(2));
    }

    @Test
    void rejectsMoreThanFiftyEvents() throws Exception {
        List<String> events = new ArrayList<>();
        for (int i = 0; i < 51; i++) {
            events.add("{\"category\":\"route_view\",\"deviceId\":\"dev-" + i + "\"}");
        }

        mockMvc.perform(post("/api/analytics/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"events\":[" + String.join(",", events) + "]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAnUnknownCategory() throws Exception {
        mockMvc.perform(post("/api/analytics/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"events\":[{\"category\":\"not_a_category\",\"deviceId\":\"dev-1\"}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAPayloadLargerThanSixtyFourKilobytes() throws Exception {
        // Valid JSON, but the raw body exceeds the 64 KB cap.
        String padding = "x".repeat(70 * 1024);

        mockMvc.perform(post("/api/analytics/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"events\":[{\"category\":\"route_view\",\"deviceId\":\"" + padding + "\"}]}"))
                .andExpect(status().isBadRequest());
    }
}
