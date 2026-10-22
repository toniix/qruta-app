package com.anthony.rutas.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

/**
 * Thin client for Supabase Storage used to host the single reference image of
 * a stop.
 *
 * <p>The bucket is public for reads, so the persisted value is the full public
 * URL ({@code /storage/v1/object/public/{bucket}/{path}}); writes and deletes
 * use the server-only secret key (legacy service_role JWT or the newer
 * {@code sb_secret_-}format key, both accepted). When {@code supabase.url} or
 * {@code supabase.service-key} is blank the feature is disabled and every
 * mutating call throws {@link StorageNotConfiguredException}, which the admin
 * controller maps to HTTP 503.
 *
 * <p>Object bytes travel as a raw request body (no HTML form), matching the
 * Supabase Storage REST contract:
 * {@code POST/DELETE /storage/v1/object/{bucket}/{path}}. Legacy JWT keys are
 * sent on both {@code Authorization: Bearer} and {@code apikey}; new-format
 * keys are not JWTs, so they travel on the {@code apikey} header only.
 */
@Slf4j
@Service
public class SupabaseStorageService {

    public static final String DEFAULT_BUCKET = "stop-images";

    /** Signals that image storage is disabled (missing URL/service key) -&gt; HTTP 503. */
    public static class StorageNotConfiguredException extends IllegalStateException {
        public StorageNotConfiguredException(String message) {
            super(message);
        }
    }

    /** Test seam so unit tests never perform real network calls. */
    interface HttpTransport {
        void post(String url, Map<String, String> headers, String contentType, byte[] body);

        void delete(String url, Map<String, String> headers);
    }

    private final String baseUrl;
    private final String serviceKey;
    private final String bucket;
    private final HttpTransport httpTransport;

    @Autowired
    public SupabaseStorageService(
            RestClient.Builder restClientBuilder,
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.service-key:}") String serviceKey,
            @Value("${supabase.storage.bucket:stop-images}") String bucket) {
        this(supabaseUrl, serviceKey, bucket, new RestClientHttpTransport(restClientBuilder));
    }

    /** Test seam: inject a stubbed transport plus explicit configuration. */
    SupabaseStorageService(String supabaseUrl, String serviceKey, String bucket, HttpTransport httpTransport) {
        this.baseUrl = trimTrailingSlash(supabaseUrl);
        this.serviceKey = serviceKey == null ? "" : serviceKey.trim();
        this.bucket = (bucket == null || bucket.isBlank()) ? DEFAULT_BUCKET : bucket.trim();
        this.httpTransport = httpTransport;
    }

    /** True only when both the project URL and the service key are present. */
    public boolean isConfigured() {
        return !baseUrl.isBlank() && !serviceKey.isBlank();
    }

    /**
     * Uploads raw image bytes and returns the resulting public URL. The caller
     * owns the object path (e.g. {@code stops/{stopId}/{uuid}.jpg}).
     */
    public String upload(byte[] bytes, String contentType, String objectPath) {
        requireConfigured();
        if (objectPath == null || objectPath.isBlank()) {
            throw new IllegalArgumentException("objectPath is required");
        }
        httpTransport.post(objectUrl(objectPath), authHeaders(), contentType, bytes);
        return publicUrl(objectPath);
    }

    /**
     * Best-effort delete of an object addressed by its full public URL. No-ops
     * for null/blank URLs or URLs outside this project's public prefix, and
     * treats a 404 as already gone (see {@link RestClientHttpTransport}).
     */
    public void deleteByPublicUrl(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) {
            return;
        }
        String prefix = publicPrefix();
        if (!publicUrl.startsWith(prefix)) {
            return;
        }
        String objectPath = publicUrl.substring(prefix.length());
        if (objectPath.isBlank() || !isConfigured()) {
            return;
        }
        httpTransport.delete(objectUrl(objectPath), authHeaders());
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new StorageNotConfiguredException(
                    "Image storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing)");
        }
    }

    private String objectUrl(String objectPath) {
        return baseUrl + "/storage/v1/object/" + bucket + "/" + objectPath;
    }

    private String publicUrl(String objectPath) {
        return publicPrefix() + objectPath;
    }

    private String publicPrefix() {
        return baseUrl + "/storage/v1/object/public/" + bucket + "/";
    }

    private Map<String, String> authHeaders() {
        // Legacy JWT keys (eyJ...) are valid bearer tokens. New-format keys
        // (sb_secret_...) are opaque strings, not JWTs, so anything downstream
        // would fail to verify them as one; Supabase expects them on the
        // apikey header.
        if (serviceKey.startsWith("eyJ")) {
            return Map.of(
                    "Authorization", "Bearer " + serviceKey,
                    "apikey", serviceKey);
        }
        return Map.of("apikey", serviceKey);
    }

    private static String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    /** Production transport backed by a Boot-managed {@link RestClient.Builder}. */
    @Slf4j
    static class RestClientHttpTransport implements HttpTransport {

        /** Cap for the logged response body so huge HTML error pages stay bounded. */
        private static final int MAX_LOGGED_BODY = 500;

        private final RestClient restClient;

        RestClientHttpTransport(RestClient.Builder builder) {
            this.restClient = builder.build();
        }

        @Override
        public void post(String url, Map<String, String> headers, String contentType, byte[] body) {
            try {
                restClient.post()
                        .uri(url)
                        .headers(h -> headers.forEach(h::set))
                        .contentType(MediaType.parseMediaType(contentType))
                        .body(body)
                        .retrieve()
                        .toBodilessEntity();
            } catch (RestClientResponseException ex) {
                log.error("Supabase Storage upload failed ({}) to {}: {}",
                        ex.getStatusCode().value(),
                        url,
                        truncate(ex.getResponseBodyAsString()));
                throw ex;
            }
            log.info("Supabase Storage upload ok: {} bytes -> {}", body == null ? 0 : body.length, url);
        }

        @Override
        public void delete(String url, Map<String, String> headers) {
            try {
                restClient.delete()
                        .uri(url)
                        .headers(h -> headers.forEach(h::set))
                        .retrieve()
                        .toBodilessEntity();
            } catch (RestClientResponseException ex) {
                // A missing object is already gone: deleting is idempotent.
                if (ex.getStatusCode().value() != 404) {
                    log.error("Supabase Storage delete failed ({}) for {}: {}",
                            ex.getStatusCode().value(), url, truncate(ex.getResponseBodyAsString()));
                    throw ex;
                }
                log.debug("Supabase Storage delete treated as no-op (404) for {}", url);
            }
        }

        private String truncate(String body) {
            if (body == null) {
                return "<no body>";
            }
            return body.length() <= MAX_LOGGED_BODY ? body : body.substring(0, MAX_LOGGED_BODY) + "...";
        }
    }
}
