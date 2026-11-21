package com.anthony.rutas.controllers;

import com.anthony.rutas.services.SmartQrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicQrControllerTest {

    private SmartQrService smartQrService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        smartQrService = mock(SmartQrService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new PublicQrController(smartQrService)).build();
    }

    @Test
    void activeQrRedirectsToCanonicalDestination() throws Exception {
        when(smartQrService.resolveAndTrack(eq("activeCode"), anyString()))
                .thenReturn(new SmartQrService.ResolvedRedirect(
                        "https://front.anthonywar.dev/mapa/ruta/L20?qr=activeCode", true));

        mockMvc.perform(get("/q/activeCode")
                        .header("X-Forwarded-For", "10.0.0.1")
                        .header("User-Agent", "Chrome"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://front.anthonywar.dev/mapa/ruta/L20?qr=activeCode"));

        verify(smartQrService).resolveAndTrack("activeCode", "10.0.0.1|Chrome");
    }

    @Test
    void pausedQrRedirectsToInactiveIndicator() throws Exception {
        when(smartQrService.resolveAndTrack(eq("pausedCode"), anyString()))
                .thenReturn(new SmartQrService.ResolvedRedirect(
                        "https://front.anthonywar.dev/?qr_error=inactive", false));

        mockMvc.perform(get("/q/pausedCode"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://front.anthonywar.dev/?qr_error=inactive"));
    }

    @Test
    void deletedQrRedirectsToNotFoundIndicator() throws Exception {
        when(smartQrService.resolveAndTrack(eq("deletedCode"), anyString()))
                .thenReturn(new SmartQrService.ResolvedRedirect(
                        "https://front.anthonywar.dev/?qr_error=not_found", false));

        mockMvc.perform(get("/q/deletedCode"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://front.anthonywar.dev/?qr_error=not_found"));
    }

    @Test
    void staleTargetQrRedirectsToTargetMissingIndicator() throws Exception {
        when(smartQrService.resolveAndTrack(eq("staleCode"), anyString()))
                .thenReturn(new SmartQrService.ResolvedRedirect(
                        "https://front.anthonywar.dev/?qr_error=target_missing", false));

        mockMvc.perform(get("/q/staleCode"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://front.anthonywar.dev/?qr_error=target_missing"));
    }
}
