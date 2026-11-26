package com.anthony.rutas.exceptions;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("ResponseStatusException preserves its HTTP status instead of turning into 500")
    void preservesResponseStatusExceptionStatusCode() {
        ResponseStatusException ex = new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Invalid billing webhook signature");

        ResponseEntity<Map<String, Object>> response = handler.handleResponseStatus(ex);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(401, response.getBody().get("status"));
        assertEquals("Invalid billing webhook signature", response.getBody().get("message"));
    }

    @Test
    @DisplayName("BadCredentialsException returns 401 instead of 500")
    void mapsBadCredentialsToUnauthorized() {
        ResponseEntity<Map<String, Object>> response = handler.handleAuthenticationException(
                new BadCredentialsException("Bad credentials"));

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(401, response.getBody().get("status"));
        assertEquals("Invalid credentials", response.getBody().get("message"));
    }

    @Test
    @DisplayName("DisabledException returns 403 instead of 500")
    void mapsDisabledAccountToForbidden() {
        ResponseEntity<Map<String, Object>> response = handler.handleAuthenticationException(
                new DisabledException("User is disabled"));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(403, response.getBody().get("status"));
        assertEquals("Account is inactive or disabled", response.getBody().get("message"));
    }
}
