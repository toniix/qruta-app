package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateStopRequest;
import com.anthony.rutas.dtos.response.StopResponse;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Stop;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import com.anthony.rutas.repositories.StopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("StopService")
@ExtendWith(MockitoExtension.class)
class StopServiceTest {

    @Mock
    private StopRepository stopRepository;
    @Mock
    private CityRepository cityRepository;
    @Mock
    private RouteStopRepository routeStopRepository;

    @InjectMocks
    private StopService stopService;

    private UUID cityId;
    private City city;

    @BeforeEach
    void setUp() {
        cityId = UUID.randomUUID();
        city = City.builder().id(cityId).name("Ica").build();
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
}
