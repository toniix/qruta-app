package com.anthony.rutas.utils;

import java.text.Normalizer;
import java.util.Locale;

public final class SlugUtils {

    private SlugUtils() {}

    public static String toSlug(String input) {
        if (input == null) return null;
        String slug = normalizeToSlug(input);
        return slug.isEmpty() ? "paradero" : slug;
    }

    /**
     * Normalizes a city name or slug into a lowercase ASCII URL slug, returning
     * an empty string when input is null or blank.
     */
    public static String toCitySlug(String input) {
        if (input == null || input.isBlank()) return "";
        return normalizeToSlug(input);
    }

    private static String normalizeToSlug(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("-+", "-");
        int start = normalized.startsWith("-") ? 1 : 0;
        int end = normalized.endsWith("-") ? normalized.length() - 1 : normalized.length();
        return start >= end ? "" : normalized.substring(start, end);
    }
}
