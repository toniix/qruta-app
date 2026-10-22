package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateStopRequest;
import com.anthony.rutas.dtos.response.StopResponse;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import com.anthony.rutas.repositories.StopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("StopService")
@ExtendWith(MockitoExtension.class)
class StopServiceTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory();

    @Mock
    private StopRepository stopRepository;
    @Mock
    private CityRepository cityRepository;
    @Mock
    private RouteStopRepository routeStopRepository;
    @Mock
    private SupabaseStorageService storageService;
    @Mock
    private ImageProcessingService imageProcessingService;

    @InjectMocks
    private StopService stopService;

    private UUID cityId;
    private City city;

    @BeforeEach
    void setUp() {
        cityId = UUID.randomUUID();
        city = City.builder().id(cityId).name("Ica").build();
    }

    private Stop stopWithLocation(UUID id) {
        return Stop.builder()
                .id(id)
                .city(city)
                .name("Paradero")
                .location(GEOMETRY_FACTORY.createPoint(new Coordinate(-75.72, -14.06)))
                .build();
    }

    @Test
    @DisplayName("Should create a stop linked to its city with accessible default")
    void shouldCreateStop() {
        CreateStopRequest request = CreateStopRequest.builder()
                .cityId(cityId.toString())
                .name("Paradero Mercado")
                .latitude(-14.06)
                .longitude(-75.72)
                .build();

        when(cityRepository.findById(cityId)).thenReturn(Optional.of(city));
        when(stopRepository.save(any(Stop.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StopResponse result = stopService.create(request);

        assertNotNull(result);
        assertEquals("Paradero Mercado", result.getName());
        assertEquals(cityId, result.getCityId());
        assertTrue(result.isAccessible());

        ArgumentCaptor<Stop> captor = ArgumentCaptor.forClass(Stop.class);
        verify(stopRepository).save(captor.capture());
        assertEquals(-14.06, captor.getValue().getLocation().getY());
        assertEquals(-75.72, captor.getValue().getLocation().getX());
    }

    @Test
    @DisplayName("Should throw when the city does not exist")
    void shouldThrowWhenCityNotFound() {
        CreateStopRequest request = CreateStopRequest.builder()
                .cityId(UUID.randomUUID().toString())
                .name("Paradero X")
                .latitude(-14.06)
                .longitude(-75.72)
                .build();

        when(cityRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> stopService.create(request));
        verify(stopRepository, never()).save(any(Stop.class));
    }

    @Test
    @DisplayName("updateImage stores the upload and returns the public URL")
    void shouldUpdateImage() {
        UUID id = UUID.randomUUID();
        Stop stop = stopWithLocation(id);
        byte[] jpeg = {1, 2, 3, 4};
        String publicUrl = "https://proj.supabase.co/storage/v1/object/public/stop-images/stops/" + id + "/x.jpg";

        when(stopRepository.findById(id)).thenReturn(Optional.of(stop));
        when(storageService.isConfigured()).thenReturn(true);
        when(imageProcessingService.toOptimizedJpeg(any(byte[].class))).thenReturn(jpeg);
        when(storageService.upload(any(byte[].class), eq("image/jpeg"), anyString())).thenReturn(publicUrl);
        when(stopRepository.save(any(Stop.class))).thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[]{9, 9});
        StopResponse result = stopService.updateImage(id, file);

        assertEquals(publicUrl, result.getImageUrl());
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(storageService).upload(eq(jpeg), eq("image/jpeg"), pathCaptor.capture());
        assertTrue(pathCaptor.getValue().startsWith("stops/" + id + "/"), pathCaptor.getValue());
        assertTrue(pathCaptor.getValue().endsWith(".jpg"), pathCaptor.getValue());
        verify(storageService, never()).deleteByPublicUrl(any());
    }

    @Test
    @DisplayName("updateImage deletes the previous object when replacing an image")
    void shouldDeletePreviousImageOnReplace() {
        UUID id = UUID.randomUUID();
        String oldUrl = "https://proj.supabase.co/storage/v1/object/public/stop-images/stops/" + id + "/old.jpg";
        Stop stop = stopWithLocation(id);
        stop.setImageUrl(oldUrl);
        String newUrl = "https://proj.supabase.co/storage/v1/object/public/stop-images/stops/" + id + "/new.jpg";

        when(stopRepository.findById(id)).thenReturn(Optional.of(stop));
        when(storageService.isConfigured()).thenReturn(true);
        when(imageProcessingService.toOptimizedJpeg(any(byte[].class))).thenReturn(new byte[]{1});
        when(storageService.upload(any(byte[].class), eq("image/jpeg"), anyString())).thenReturn(newUrl);
        when(stopRepository.save(any(Stop.class))).thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[]{1, 2});
        StopResponse result = stopService.updateImage(id, file);

        assertEquals(newUrl, result.getImageUrl());
        verify(storageService).deleteByPublicUrl(oldUrl);
    }

    @Test
    @DisplayName("updateImage keeps the new image when deleting the previous object fails")
    void shouldKeepNewImageWhenPreviousDeleteFails() {
        UUID id = UUID.randomUUID();
        String oldUrl = "https://proj.supabase.co/storage/v1/object/public/stop-images/stops/" + id + "/old.jpg";
        Stop stop = stopWithLocation(id);
        stop.setImageUrl(oldUrl);
        String newUrl = "https://proj.supabase.co/storage/v1/object/public/stop-images/stops/" + id + "/new.jpg";

        when(stopRepository.findById(id)).thenReturn(Optional.of(stop));
        when(storageService.isConfigured()).thenReturn(true);
        when(imageProcessingService.toOptimizedJpeg(any(byte[].class))).thenReturn(new byte[]{1});
        when(storageService.upload(any(byte[].class), eq("image/jpeg"), anyString())).thenReturn(newUrl);
        when(stopRepository.save(any(Stop.class))).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RuntimeException("storage unavailable")).when(storageService).deleteByPublicUrl(oldUrl);

        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[]{1, 2});
        StopResponse result = stopService.updateImage(id, file);

        // The cleanup failure must not roll back the row update, or the just
        // uploaded object would leak with no DB reference pointing at it.
        assertEquals(newUrl, result.getImageUrl());
        verify(stopRepository).save(stop);
    }

    @Test
    @DisplayName("updateImage rejects when storage is not configured")
    void shouldRejectImageUploadWhenStorageNotConfigured() {
        UUID id = UUID.randomUUID();
        when(stopRepository.findById(id)).thenReturn(Optional.of(stopWithLocation(id)));
        when(storageService.isConfigured()).thenReturn(false);

        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[]{1});

        assertThrows(SupabaseStorageService.StorageNotConfiguredException.class,
                () -> stopService.updateImage(id, file));
        verify(storageService, never()).upload(any(), anyString(), anyString());
    }

    @Test
    @DisplayName("updateImage rejects a stop that does not exist")
    void shouldRejectImageUploadForMissingStop() {
        UUID id = UUID.randomUUID();
        when(stopRepository.findById(id)).thenReturn(Optional.empty());

        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[]{1});

        assertThrows(ResourceNotFoundException.class, () -> stopService.updateImage(id, file));
    }

    @Test
    @DisplayName("updateImage rejects an unsupported content type")
    void shouldRejectUnsupportedContentType() {
        UUID id = UUID.randomUUID();
        when(stopRepository.findById(id)).thenReturn(Optional.of(stopWithLocation(id)));
        when(storageService.isConfigured()).thenReturn(true);

        MockMultipartFile file = new MockMultipartFile("file", "notes.txt", "text/plain", new byte[]{1});

        assertThrows(BadRequestException.class, () -> stopService.updateImage(id, file));
        verify(imageProcessingService, never()).toOptimizedJpeg(any());
    }

    @Test
    @DisplayName("updateImage rejects a file above 2 MB")
    void shouldRejectOversizedUpload() {
        UUID id = UUID.randomUUID();
        when(stopRepository.findById(id)).thenReturn(Optional.of(stopWithLocation(id)));
        when(storageService.isConfigured()).thenReturn(true);

        byte[] tooBig = new byte[ImageProcessingService.MAX_INPUT_BYTES + 1];
        MockMultipartFile file = new MockMultipartFile("file", "big.jpg", "image/jpeg", tooBig);

        assertThrows(BadRequestException.class, () -> stopService.updateImage(id, file));
        verify(imageProcessingService, never()).toOptimizedJpeg(any());
    }

    @Test
    @DisplayName("removeImage deletes the current object and clears the field")
    void shouldRemoveImage() {
        UUID id = UUID.randomUUID();
        String url = "https://proj.supabase.co/storage/v1/object/public/stop-images/stops/" + id + "/x.jpg";
        Stop stop = stopWithLocation(id);
        stop.setImageUrl(url);

        when(stopRepository.findById(id)).thenReturn(Optional.of(stop));
        when(stopRepository.save(any(Stop.class))).thenAnswer(inv -> inv.getArgument(0));

        StopResponse result = stopService.removeImage(id);

        assertNull(result.getImageUrl());
        assertNull(stop.getImageUrl());
        verify(storageService).deleteByPublicUrl(url);
    }

    @Test
    @DisplayName("removeImage is idempotent when there is no image")
    void shouldRemoveImageIdempotently() {
        UUID id = UUID.randomUUID();
        Stop stop = stopWithLocation(id);

        when(stopRepository.findById(id)).thenReturn(Optional.of(stop));
        when(stopRepository.save(any(Stop.class))).thenAnswer(inv -> inv.getArgument(0));

        StopResponse result = stopService.removeImage(id);

        assertNull(result.getImageUrl());
        verify(storageService, never()).deleteByPublicUrl(any());
    }
}
