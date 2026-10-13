package com.anthony.rutas.services;

import com.anthony.rutas.dtos.response.ReverseGeocodeResponse;
import com.anthony.rutas.exceptions.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

/**
 * TDD harness for task 4.1 (reverse-geocode proxy). Plain Mockito + a real
 * {@link ConcurrentMapCacheManager} (stand-in for the production Caffeine
 * manager, same Spring Cache API) so cache behaviour is verifiable without a
 * Spring context.
 */
@ExtendWith(MockitoExtension.class)
class ReverseGeocodeServiceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final double LAT = -14.0678;
    private static final double LNG = -75.7286;

    @Mock
    private ReverseGeocodeService.HttpFetcher httpFetcher;

    private CacheManager cacheManager;
    private ReverseGeocodeService service;

    @BeforeEach
    void setUp() {
        cacheManager = new ConcurrentMapCacheManager("reverseGeocode");
        service = new ReverseGeocodeService(cacheManager, httpFetcher, "TEST_KEY", 1000);
    }

    private static org.mockito.ArgumentMatcher<String> googleUrl() {
        return url -> url != null && url.contains("maps.googleapis");
    }

    private static org.mockito.ArgumentMatcher<String> photonUrl() {
        return url -> url != null && url.contains("photon.komoot.io");
    }

    private static JsonNode googleSuccessPayload() throws Exception {
        return MAPPER.readTree("""
                {
                  "status": "OK",
                  "results": [
                    {
                      "formatted_address": "Av. Bolivar 123, Ica, Peru",
                      "types": ["street_address"],
                      "address_components": [
                        {"long_name": "123", "short_name": "123", "types": ["street_number"]},
                        {"long_name": "Av. Bolivar", "short_name": "Av. Bolivar", "types": ["route"]},
                        {"long_name": "Ica", "short_name": "Ica", "types": ["locality", "political"]},
                        {"long_name": "Peru", "short_name": "PE", "types": ["country", "political"]}
                      ]
                    }
                  ]
                }
                """);
    }

    private static JsonNode googleSuccessPayloadWithoutStreetNumber() throws Exception {
        return MAPPER.readTree("""
                {
                  "status": "OK",
                  "results": [
                    {
                      "formatted_address": "Av. Bolivar, Ica, Peru",
                      "types": ["street_address"],
                      "address_components": [
                        {"long_name": "Av. Bolivar", "short_name": "Av. Bolivar", "types": ["route"]},
                        {"long_name": "Ica", "short_name": "Ica", "types": ["locality", "political"]},
                        {"long_name": "Peru", "short_name": "PE", "types": ["country", "political"]}
                      ]
                    }
                  ]
                }
                """);
    }

    private static JsonNode photonSuccessPayload() throws Exception {
        return MAPPER.readTree("""
                {
                  "features": [
                    {
                      "type": "Feature",
                      "geometry": {"type": "Point", "coordinates": [-75.7286, -14.0678]},
                      "properties": {
                        "name": "Hostal Dorado",
                        "street": "Av. Bolivar",
                        "district": "Ica",
                        "city": "Ica",
                        "county": "Ica",
                        "country": "Peru"
                      }
                    }
                  ]
                }
                """);
    }

    private static JsonNode emptyPhotonPayload() throws Exception {
        return MAPPER.readTree("{\"features\": []}");
    }

    @Nested
    @DisplayName("google first")
    class GoogleFirst {

        @Test
        @DisplayName("Should return Google-derived label with source google")
        void shouldReturnGoogleLabel() throws Exception {
            when(httpFetcher.get(argThat(googleUrl()))).thenReturn(googleSuccessPayload());

            ReverseGeocodeResponse result = service.reverseGeocode(LAT, LNG);

            assertNotNull(result);
            assertEquals("Av. Bolivar 123, Ica, Peru", result.getFormattedAddress());
            assertEquals("Av. Bolivar", result.getStreet());
            assertEquals("123", result.getStreetNumber());
            assertEquals("Ica", result.getDistrict());
            assertEquals("Ica", result.getCity());
            assertEquals("google", result.getSource());
            verify(httpFetcher, never()).get(argThat(photonUrl()));
        }

        @Test
        @DisplayName("Should return empty street number when Google result has none")
        void shouldReturnEmptyStreetNumberWhenAbsent() throws Exception {
            when(httpFetcher.get(argThat(googleUrl()))).thenReturn(googleSuccessPayloadWithoutStreetNumber());

            ReverseGeocodeResponse result = service.reverseGeocode(LAT, LNG);

            assertNotNull(result);
            assertEquals("Av. Bolivar", result.getStreet());
            assertEquals("", result.getStreetNumber());
            assertEquals("google", result.getSource());
        }

        @Test
        @DisplayName("Should fall back to Photon when Google fails")
        void shouldFallBackToPhotonOnGoogleFailure() throws Exception {
            when(httpFetcher.get(argThat(googleUrl()))).thenThrow(new RuntimeException("timeout"));
            when(httpFetcher.get(argThat(photonUrl()))).thenReturn(photonSuccessPayload());

            ReverseGeocodeResponse result = service.reverseGeocode(LAT, LNG);

            assertNotNull(result);
            assertEquals("Hostal Dorado, Av. Bolivar, Ica", result.getFormattedAddress());
            assertEquals("Av. Bolivar", result.getStreet());
            assertEquals("", result.getStreetNumber());
            assertEquals("Ica", result.getDistrict());
            assertEquals("Ica", result.getCity());
            assertEquals("photon", result.getSource());
        }

        @Test
        @DisplayName("Should use Photon without calling Google when quota is exhausted")
        void shouldSkipGoogleWhenQuotaExhausted() throws Exception {
            service = new ReverseGeocodeService(cacheManager, httpFetcher, "TEST_KEY", 1);
            when(httpFetcher.get(argThat(googleUrl()))).thenReturn(googleSuccessPayload());
            when(httpFetcher.get(argThat(photonUrl()))).thenReturn(photonSuccessPayload());

            ReverseGeocodeResponse first = service.reverseGeocode(LAT, LNG);
            assertEquals("google", first.getSource());

            ReverseGeocodeResponse second = service.reverseGeocode(LAT + 0.5, LNG + 0.5);
            assertEquals("photon", second.getSource());

            verify(httpFetcher, times(1)).get(argThat(googleUrl()));
            verify(httpFetcher, times(1)).get(argThat(photonUrl()));
        }

        @Test
        @DisplayName("Should throw upstream exception when both providers fail")
        void shouldThrowWhenBothProvidersFail() throws Exception {
            when(httpFetcher.get(argThat(googleUrl()))).thenThrow(new RuntimeException("timeout"));
            when(httpFetcher.get(argThat(photonUrl()))).thenReturn(emptyPhotonPayload());

            assertThrows(ReverseGeocodeService.UpstreamUnavailableException.class,
                    () -> service.reverseGeocode(LAT, LNG));
        }
    }

    @Nested
    @DisplayName("validation")
    class Validation {

        @Test
        @DisplayName("Should reject missing or out-of-range coordinates without calling providers")
        void shouldRejectInvalidCoordinates() {
            assertThrows(BadRequestException.class, () -> service.reverseGeocode(null, LNG));
            assertThrows(BadRequestException.class, () -> service.reverseGeocode(LAT, null));
            assertThrows(BadRequestException.class, () -> service.reverseGeocode(91.0, LNG));
            assertThrows(BadRequestException.class, () -> service.reverseGeocode(-91.0, LNG));
            assertThrows(BadRequestException.class, () -> service.reverseGeocode(LAT, 181.0));
            assertThrows(BadRequestException.class, () -> service.reverseGeocode(LAT, -181.0));
            assertThrows(BadRequestException.class, () -> service.reverseGeocode(Double.NaN, LNG));
            verifyNoInteractions(httpFetcher);
        }
    }

    @Nested
    @DisplayName("cache")
    class Cache {

        @Test
        @DisplayName("Should serve the second identical request from cache with no provider call")
        void shouldServeSecondRequestFromCache() throws Exception {
            when(httpFetcher.get(argThat(googleUrl()))).thenReturn(googleSuccessPayload());

            ReverseGeocodeResponse first = service.reverseGeocode(LAT, LNG);
            ReverseGeocodeResponse second = service.reverseGeocode(LAT, LNG);

            assertEquals(first.getFormattedAddress(), second.getFormattedAddress());
            assertEquals(first.getSource(), second.getSource());
            verify(httpFetcher, times(1)).get(argThat(googleUrl()));
        }
    }
}
