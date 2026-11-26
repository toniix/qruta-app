package com.anthony.rutas.services;

import com.anthony.rutas.exceptions.ConflictException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.CommunityPostRepository;
import com.anthony.rutas.repositories.DisruptionRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.RouteStopRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CityService")
class CityServiceTest {

    @Mock
    private CityRepository cityRepository;
    @Mock
    private OperatorRepository operatorRepository;
    @Mock
    private CommunityPostRepository communityPostRepository;
    @Mock
    private DisruptionRepository disruptionRepository;
    @Mock
    private RouteStopRepository routeStopRepository;

    @InjectMocks
    private CityService cityService;

    @Test
    @DisplayName("delete detaches community posts, cleans disruptions and route stops, and deletes city in order")
    void deleteCleansDependenciesInOrder() {
        UUID cityId = UUID.randomUUID();
        when(cityRepository.existsById(cityId)).thenReturn(true);
        when(operatorRepository.countByCityId(cityId)).thenReturn(0L);

        cityService.delete(cityId);

        InOrder order = inOrder(
                communityPostRepository,
                disruptionRepository,
                routeStopRepository,
                cityRepository);
        order.verify(communityPostRepository).detachCity(cityId);
        order.verify(communityPostRepository).detachRoutesByCityId(cityId);
        order.verify(disruptionRepository).deleteByRouteTransportLineCityId(cityId);
        order.verify(routeStopRepository).deleteByStopCityId(cityId);
        order.verify(cityRepository).deleteById(cityId);
    }

    @Test
    @DisplayName("delete throws ConflictException when operators belong to the city")
    void deleteRejectsWhenOperatorsExist() {
        UUID cityId = UUID.randomUUID();
        when(cityRepository.existsById(cityId)).thenReturn(true);
        when(operatorRepository.countByCityId(cityId)).thenReturn(2L);

        ConflictException error = assertThrows(ConflictException.class, () -> cityService.delete(cityId));

        assertTrue(error.getMessage().contains("2 operators belong to this city."));
        verifyNoInteractions(communityPostRepository, disruptionRepository, routeStopRepository);
        verify(cityRepository, never()).deleteById(any(UUID.class));
    }

    @Test
    @DisplayName("delete throws ResourceNotFoundException when city does not exist")
    void deleteRejectsMissingCity() {
        UUID cityId = UUID.randomUUID();
        when(cityRepository.existsById(cityId)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> cityService.delete(cityId));

        verifyNoInteractions(operatorRepository, communityPostRepository, disruptionRepository, routeStopRepository);
        verify(cityRepository, never()).deleteById(any(UUID.class));
    }
}
