package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.ReverseGeocodeResponse;
import com.anthony.rutas.exceptions.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.Locale;

/**
 * Reverse-geocode proxy: Google Geocoding first (Spanish, Peru-biased) while a
 * configurable daily quota remains, Photon (OSM) fallback otherwise — including
 * no-key mode, Google errors/timeouts, and quota exhaustion.
 *
 * <p>Quota is counted in-memory and resets daily. This assumes a single
 * application instance (launch assumption): with multiple instances each one
 * enforces its own cap, so Google usage can exceed the configured value by up
 * to the instance count.
 *
 * <p>Results are cached through the Spring {@link CacheManager} (Caffeine in
 * production, 30-day TTL via {@code spring.cache.caffeine.spec}) keyed by
 * coordinates rounded to 3 decimals (~100 m). The Google API key is only ever
 * placed in the outbound request URL and is never logged.
 */
@Service
public class ReverseGeocodeService {

    static final String CACHE_NAME = "reverseGeocode";
    private static final int PROVIDER_TIMEOUT_MS = 4000;
    private static final String GOOGLE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
    private static final String PHOTON_BASE = "https://photon.komoot.io/reverse";

    private final CacheManager cacheManager;
    private final HttpFetcher httpFetcher;
    private final String googleApiKey;
    private final int dailyQuota;

    private final Object lock = new Object();
    private LocalDate quotaDay = LocalDate.now();
    private int googleCallsToday;

    @Autowired
    public ReverseGeocodeService(
            CacheManager cacheManager,
            @Value("${geocode.google-api-key:}") String googleApiKey,
            @Value("${geocode.daily-quota:1000}") int dailyQuota) {
        this(cacheManager, new RestClientHttpFetcher(), googleApiKey, dailyQuota);
    }

    /** Test seam: inject a stubbed fetcher and explicit quota settings. */
    ReverseGeocodeService(CacheManager cacheManager, HttpFetcher httpFetcher,
            String googleApiKey, int dailyQuota) {
        this.cacheManager = cacheManager;
        this.httpFetcher = httpFetcher;
        this.googleApiKey = googleApiKey == null ? "" : googleApiKey.trim();
        this.dailyQuota = dailyQuota;
    }

    /** Minimal HTTP seam so unit tests can stub providers without a server. */
    interface HttpFetcher {
        JsonNode get(String url);
    }

    /** Production fetcher with ~4 s connect/read timeouts on every call. */
    static class RestClientHttpFetcher implements HttpFetcher {
        private final RestClient restClient;

        RestClientHttpFetcher() {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(PROVIDER_TIMEOUT_MS);
            requestFactory.setReadTimeout(PROVIDER_TIMEOUT_MS);
            this.restClient = RestClient.builder().requestFactory(requestFactory).build();
        }

        @Override
        public JsonNode get(String url) {
            return restClient.get().uri(url).retrieve().body(JsonNode.class);
        }
    }

    /** Thrown when every provider fails; mapped to 503 by the controller. */
    public static class UpstreamUnavailableException extends RuntimeException {
        public UpstreamUnavailableException(String message) {
            super(message);
        }
    }

    public ReverseGeocodeResponse reverseGeocode(Double lat, Double lng) {
        validate(lat, lng);
        String key = cacheKey(lat, lng);
        Cache cache = cacheManager.getCache(CACHE_NAME);
        ReverseGeocodeResponse cached = cache != null ? cache.get(key, ReverseGeocodeResponse.class) : null;
        if (cached != null) {
            return cached;
        }
        ReverseGeocodeResponse fresh = resolve(lat, lng);
        if (cache != null) {
            cache.put(key, fresh);
        }
        return fresh;
    }

    private ReverseGeocodeResponse resolve(double lat, double lng) {
        if (isGoogleAvailable()) {
            try {
                ReverseGeocodeResponse google = fetchFromGoogle(lat, lng);
                if (google != null) {
                    return google;
                }
            } catch (RuntimeException ignored) {
                // Google error/timeout -> fall through to Photon.
            }
        }
        try {
            ReverseGeocodeResponse photon = fetchFromPhoton(lat, lng);
            if (photon != null) {
                return photon;
            }
        } catch (RuntimeException ignored) {
            // Photon error/timeout -> 503 below.
        }
        throw new UpstreamUnavailableException("Geocoding providers unavailable, try again later");
    }

    private boolean isGoogleAvailable() {
        if (googleApiKey.isBlank()) {
            return false;
        }
        return tryConsumeQuota();
    }

    /**
     * Single-instance in-memory daily quota: at most {@code dailyQuota} Google
     * attempts per calendar day. Each attempt consumes one unit, including
     * attempts that later fail.
     */
    private boolean tryConsumeQuota() {
        synchronized (lock) {
            LocalDate today = LocalDate.now();
            if (!today.equals(quotaDay)) {
                quotaDay = today;
                googleCallsToday = 0;
            }
            if (googleCallsToday >= dailyQuota) {
                return false;
            }
            googleCallsToday++;
            return true;
        }
    }

    private ReverseGeocodeResponse fetchFromGoogle(double lat, double lng) {
        // The key lives only in this outbound URL; it is never logged.
        String url = GOOGLE_BASE + "?latlng=" + lat + "," + lng
                + "&key=" + googleApiKey + "&language=es&region=PE";
        JsonNode root = httpFetcher.get(url);
        if (root == null || !"OK".equalsIgnoreCase(root.path("status").asText())) {
            return null;
        }
        JsonNode results = root.path("results");
        if (!results.isArray() || results.isEmpty()) {
            return null;
        }
        JsonNode best = selectGoogleResult(results);
        if (best == null) {
            best = results.get(0);
        }
        String formatted = best.path("formatted_address").asText(null);
        if (formatted == null || formatted.isBlank()) {
            return null;
        }
        String street = addressComponent(best, "route");
        String streetNumber = addressComponent(best, "street_number");
        String district = firstNonBlank(
                addressComponent(best, "sublocality"),
                addressComponent(best, "neighborhood"),
                addressComponent(best, "sublocality_level_1"));
        String city = firstNonBlank(
                addressComponent(best, "locality"),
                addressComponent(best, "administrative_area_level_2"));
        String[] parts = formatted.split(",");
        if (street.isBlank() && parts.length > 0) {
            street = parts[0].trim();
        }
        if (district.isBlank() && parts.length > 1) {
            district = parts[1].trim();
        }
        if (city.isBlank() && parts.length > 2) {
            city = parts[2].trim();
        }
        return ReverseGeocodeResponse.builder()
                .formattedAddress(formatted)
                .street(street)
                .streetNumber(streetNumber)
                .district(district)
                .city(city)
                .source("google")
                .build();
    }

    /**
     * Prefers results typed {@code street_address}, else the first result typed
     * {@code route}, {@code neighborhood} or {@code locality}.
     */
    private JsonNode selectGoogleResult(JsonNode results) {
        JsonNode fallback = null;
        for (JsonNode result : results) {
            if (hasType(result, "street_address")) {
                return result;
            }
            if (fallback == null
                    && (hasType(result, "route") || hasType(result, "neighborhood") || hasType(result, "locality"))) {
                fallback = result;
            }
        }
        return fallback;
    }

    private boolean hasType(JsonNode result, String type) {
        JsonNode types = result.path("types");
        if (!types.isArray()) {
            return false;
        }
        for (JsonNode t : types) {
            if (type.equals(t.asText())) {
                return true;
            }
        }
        return false;
    }

    private String addressComponent(JsonNode result, String type) {
        JsonNode components = result.path("address_components");
        if (!components.isArray()) {
            return "";
        }
        for (JsonNode component : components) {
            if (hasType(component, type)) {
                return component.path("long_name").asText("");
            }
        }
        return "";
    }

    /**
     * Mirrors the field mapping of {@code reverseGeocode} in the frontend
     * {@code geocodingService} (Photon shape -> unified label), without logging.
     */
    private ReverseGeocodeResponse fetchFromPhoton(double lat, double lng) {
        String url = PHOTON_BASE + "?lat=" + lat + "&lon=" + lng;
        JsonNode root = httpFetcher.get(url);
        JsonNode features = root != null ? root.path("features") : null;
        if (features == null || !features.isArray() || features.isEmpty()) {
            return null;
        }
        JsonNode p = features.get(0).path("properties");
        if (p.isMissingNode() || p.isNull()) {
            return null;
        }
        String name = text(p, "name");
        String propStreet = text(p, "street");
        String streetOrName = firstNonBlank(name, propStreet, text(p, "locality"));
        String district = firstNonBlank(text(p, "district"), text(p, "city"), text(p, "county"));

        String formatted;
        if (!streetOrName.isBlank()) {
            if (!name.isBlank() && !propStreet.isBlank() && !name.equals(propStreet)) {
                formatted = name + ", " + propStreet;
            } else {
                formatted = streetOrName;
            }
            if (!district.isBlank() && !formatted.contains(district)) {
                formatted = formatted + ", " + district;
            }
        } else {
            formatted = !district.isBlank() ? district + ", Perú" : "Tu ubicación actual";
        }
        return ReverseGeocodeResponse.builder()
                .formattedAddress(formatted)
                .street(firstNonBlank(propStreet, name))
                .streetNumber("")
                .district(district)
                .city(firstNonBlank(text(p, "city"), district))
                .source("photon")
                .build();
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return (value.isMissingNode() || value.isNull()) ? "" : value.asText("");
    }

    private String firstNonBlank(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate;
            }
        }
        return "";
    }

    /** Cache key: coordinates rounded to 3 decimals (~100 m). */
    static String cacheKey(double lat, double lng) {
        return String.format(Locale.ROOT, "%.3f,%.3f", lat, lng);
    }

    private void validate(Double lat, Double lng) {
        if (lat == null || lng == null) {
            throw new BadRequestException("lat and lng query parameters are required");
        }
        if (lat.isNaN() || lng.isNaN() || lat.isInfinite() || lng.isInfinite()
                || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new BadRequestException("lat must be between -90 and 90 and lng between -180 and 180");
        }
    }
}
