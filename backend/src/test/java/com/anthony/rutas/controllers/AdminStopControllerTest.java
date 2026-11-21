package com.anthony.rutas.controllers;

import com.anthony.rutas.exceptions.ConflictException;
import com.anthony.rutas.exceptions.GlobalExceptionHandler;
import com.anthony.rutas.services.StopService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminStopControllerTest {

    private StopService stopService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        stopService = mock(StopService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminStopController(stopService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void deleteExposesActionableQrConflictMessage() throws Exception {
        UUID stopId = UUID.randomUUID();
        String message = "Cannot delete stop: 1 QR code still target this stop. "
                + "Edit or delete those QR codes first.";
        doThrow(new ConflictException(message)).when(stopService).delete(stopId);

        mockMvc.perform(delete("/api/admin/stops/" + stopId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value(message));
    }
}
