package com.anthony.rutas.utils;

import com.anthony.rutas.exceptions.BadRequestException;

import java.util.UUID;

/**
 * Shared UUID parsing helpers that consistently translate malformed values
 * into HTTP 400 {@link BadRequestException} instead of raw {@link IllegalArgumentException}.
 */
public final class UuidUtils {

    private UuidUtils() {
    }

    public static UUID parseRequired(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Invalid " + label + ": value is required");
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid " + label + ": " + value);
        }
    }

    public static UUID parseOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
