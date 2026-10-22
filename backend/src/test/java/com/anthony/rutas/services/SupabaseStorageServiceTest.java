package com.anthony.rutas.services;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("SupabaseStorageService")
class SupabaseStorageServiceTest {

    private static final String URL = "https://proj.supabase.co";
    /** Legacy service_role keys are JWTs (eyJ...), valid on Authorization: Bearer. */
    private static final String LEGACY_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig";
    /** New-format secret keys are opaque strings, not JWTs. */
    private static final String SECRET_KEY = "sb_secret_random22chars000000000_che77";
    private static final String BUCKET = "stop-images";

    private final SupabaseStorageService.HttpTransport transport = mock(SupabaseStorageService.HttpTransport.class);

    @Test
    @DisplayName("isConfigured is false when the URL is blank")
    void shouldBeUnconfiguredWithoutUrl() {
        assertFalse(new SupabaseStorageService("", LEGACY_KEY, BUCKET, transport).isConfigured());
        assertFalse(new SupabaseStorageService("   ", LEGACY_KEY, BUCKET, transport).isConfigured());
    }

    @Test
    @DisplayName("isConfigured is false when the service key is blank")
    void shouldBeUnconfiguredWithoutKey() {
        assertFalse(new SupabaseStorageService(URL, "", BUCKET, transport).isConfigured());
    }

    @Test
    @DisplayName("isConfigured is true when URL and key are present")
    void shouldBeConfiguredWhenUrlAndKeyPresent() {
        assertTrue(new SupabaseStorageService(URL, LEGACY_KEY, BUCKET, transport).isConfigured());
    }

    @Test
    @DisplayName("upload posts raw bytes and returns the public URL")
    void shouldUploadAndReturnPublicUrl() {
        SupabaseStorageService service = new SupabaseStorageService(URL, LEGACY_KEY, BUCKET, transport);
        byte[] body = {1, 2, 3};

        String publicUrl = service.upload(body, "image/jpeg", "stops/abc/def.jpg");

        assertEquals(URL + "/storage/v1/object/public/" + BUCKET + "/stops/abc/def.jpg", publicUrl);
        verify(transport).post(
                eq(URL + "/storage/v1/object/" + BUCKET + "/stops/abc/def.jpg"),
                argThat((Map<String, String> h) -> ("Bearer " + LEGACY_KEY).equals(h.get("Authorization"))
                        && LEGACY_KEY.equals(h.get("apikey"))),
                eq("image/jpeg"),
                same(body));
    }

    @Test
    @DisplayName("new-format secret keys travel on the apikey header only")
    void shouldSendSecretKeyOnApikeyHeaderOnly() {
        SupabaseStorageService service = new SupabaseStorageService(URL, SECRET_KEY, BUCKET, transport);

        service.upload(new byte[]{1, 2, 3}, "image/jpeg", "stops/abc/def.jpg");

        verify(transport).post(
                eq(URL + "/storage/v1/object/" + BUCKET + "/stops/abc/def.jpg"),
                argThat((Map<String, String> h) -> SECRET_KEY.equals(h.get("apikey"))
                        && !h.containsKey("Authorization")),
                eq("image/jpeg"),
                any());
    }

    @Test
    @DisplayName("upload throws when the service is not configured")
    void shouldThrowUploadWhenUnconfigured() {
        SupabaseStorageService service = new SupabaseStorageService("", "", BUCKET, transport);

        assertThrows(SupabaseStorageService.StorageNotConfiguredException.class,
                () -> service.upload(new byte[]{1}, "image/jpeg", "stops/a/b.jpg"));
        verifyNoInteractions(transport);
    }

    @Test
    @DisplayName("deleteByPublicUrl no-ops on null or blank URLs")
    void shouldNoOpOnNullOrBlank() {
        SupabaseStorageService service = new SupabaseStorageService(URL, LEGACY_KEY, BUCKET, transport);

        service.deleteByPublicUrl(null);
        service.deleteByPublicUrl("   ");

        verifyNoInteractions(transport);
    }

    @Test
    @DisplayName("deleteByPublicUrl no-ops on a URL outside the known prefix")
    void shouldNoOpOnMismatchedUrl() {
        SupabaseStorageService service = new SupabaseStorageService(URL, LEGACY_KEY, BUCKET, transport);

        service.deleteByPublicUrl("https://other.example.com/storage/v1/object/public/other/x.jpg");

        verifyNoInteractions(transport);
    }

    @Test
    @DisplayName("deleteByPublicUrl derives the object path and deletes it")
    void shouldDeriveObjectPathAndDelete() {
        SupabaseStorageService service = new SupabaseStorageService(URL, LEGACY_KEY, BUCKET, transport);
        String publicUrl = URL + "/storage/v1/object/public/" + BUCKET + "/stops/abc/def.jpg";

        service.deleteByPublicUrl(publicUrl);

        verify(transport).delete(
                eq(URL + "/storage/v1/object/" + BUCKET + "/stops/abc/def.jpg"),
                argThat((Map<String, String> h) -> ("Bearer " + LEGACY_KEY).equals(h.get("Authorization"))
                        && LEGACY_KEY.equals(h.get("apikey"))));
    }
}
