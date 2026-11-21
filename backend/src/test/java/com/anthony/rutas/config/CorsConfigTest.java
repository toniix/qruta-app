package com.anthony.rutas.config;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CorsConfigTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        CorsConfig corsConfig = new CorsConfig();
        ReflectionTestUtils.setField(corsConfig, "allowedOrigins", "http://localhost:5173");
        mockMvc = MockMvcBuilders.standaloneSetup()
                .addFilters(corsConfig.corsFilter())
                .build();
    }

    @Test
    void allowsPatchPreflightForQrStatusUpdates() throws Exception {
        mockMvc.perform(options("/api/admin/qr-codes/00000000-0000-0000-0000-000000000000")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "PATCH")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string(
                        "Access-Control-Allow-Methods", Matchers.containsString("PATCH")));
    }

    @Test
    void allowsPatchPreflightForOperatorQrStatusUpdates() throws Exception {
        mockMvc.perform(options("/api/operator/qr-codes/00000000-0000-0000-0000-000000000000")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "PATCH")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Access-Control-Allow-Methods", Matchers.containsString("PATCH")));
    }
}
