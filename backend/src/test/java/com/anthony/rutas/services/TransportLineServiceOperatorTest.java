package com.anthony.rutas.services;

import com.anthony.rutas.dtos.request.CreateTransportLineRequest;
import com.anthony.rutas.dtos.request.UpdateTransportLineRequest;
import com.anthony.rutas.entities.City;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.TransportLine;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.CityRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.TransportLineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransportLineServiceOperatorTest {

    private static final UUID CITY_ID = UUID.randomUUID();
    private static final UUID LINE_ID = UUID.randomUUID();
    private static final UUID OPERATOR_ID = UUID.randomUUID();

    @Mock
    private TransportLineRepository transportLineRepository;
    @Mock
    private CityRepository cityRepository;
    @Mock
    private OperatorRepository operatorRepository;

    private TransportLineService service;

    @BeforeEach
    void setUp() {
        service = new TransportLineService(transportLineRepository, cityRepository, operatorRepository);
    }

    private City city() {
        return City.builder().id(CITY_ID).name("Ica").build();
    }

    private Operator activeOperator() {
        return Operator.builder().id(OPERATOR_ID).name("Expreso Ica").active(true).build();
    }

    private TransportLine line() {
        return TransportLine.builder()
                .id(LINE_ID)
                .city(city())
                .operator(activeOperator())
                .name("Línea 1")
                .status("ACTIVE")
                .build();
    }

    @Test
    @DisplayName("create assigns an active operator when operatorId is provided")
    void createsLineWithOperator() {
        when(cityRepository.findById(CITY_ID)).thenReturn(Optional.of(city()));
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(activeOperator()));
        when(transportLineRepository.save(any(TransportLine.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.create(CreateTransportLineRequest.builder()
                .cityId(CITY_ID.toString())
                .name("Línea 1")
                .operatorId(OPERATOR_ID.toString())
                .build());

        assertThat(response.getOperatorId()).isEqualTo(OPERATOR_ID);
        assertThat(response.getOperatorName()).isEqualTo("Expreso Ica");
    }

    @Test
    @DisplayName("create leaves operatorId null when omitted")
    void createsLineWithoutOperator() {
        when(cityRepository.findById(CITY_ID)).thenReturn(Optional.of(city()));
        when(transportLineRepository.save(any(TransportLine.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.create(CreateTransportLineRequest.builder()
                .cityId(CITY_ID.toString())
                .name("Línea 1")
                .build());

        assertThat(response.getOperatorId()).isNull();
    }

    @Test
    @DisplayName("create rejects an unknown operatorId")
    void rejectsUnknownOperatorOnCreate() {
        when(cityRepository.findById(CITY_ID)).thenReturn(Optional.of(city()));
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(CreateTransportLineRequest.builder()
                .cityId(CITY_ID.toString())
                .name("Línea 1")
                .operatorId(OPERATOR_ID.toString())
                .build()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Operator");

        verify(transportLineRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("update clears the assignment when operatorId is blank")
    void clearsOperator() {
        when(transportLineRepository.findById(LINE_ID)).thenReturn(Optional.of(line()));
        when(transportLineRepository.save(any(TransportLine.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.update(LINE_ID, UpdateTransportLineRequest.builder()
                .name("Línea 1 - Actualizada")
                .operatorId("")
                .build());

        assertThat(response.getOperatorId()).isNull();

        ArgumentCaptor<TransportLine> saved = ArgumentCaptor.forClass(TransportLine.class);
        verify(transportLineRepository).save(saved.capture());
        assertThat(saved.getValue().getOperator()).isNull();
    }

    @Test
    @DisplayName("update rejects assigning an inactive operator different from the current one")
    void rejectsInactiveOperatorAssignment() {
        when(transportLineRepository.findById(LINE_ID)).thenReturn(Optional.of(line()));
        Operator inactive = activeOperator();
        inactive.setId(UUID.randomUUID());
        inactive.setActive(false);
        when(operatorRepository.findById(inactive.getId())).thenReturn(Optional.of(inactive));

        assertThatThrownBy(() -> service.update(LINE_ID, UpdateTransportLineRequest.builder()
                .operatorId(inactive.getId().toString())
                .build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("inactivo");
    }

    @Test
    @DisplayName("update keeps the current operator even if it was later deactivated")
    void keepsCurrentOperatorWhenUnchanged() {
        Operator nowInactive = activeOperator();
        nowInactive.setActive(false);
        TransportLine existing = TransportLine.builder()
                .id(LINE_ID).city(city()).operator(nowInactive).name("Línea 1").status("ACTIVE").build();
        when(transportLineRepository.findById(LINE_ID)).thenReturn(Optional.of(existing));
        when(transportLineRepository.save(any(TransportLine.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.update(LINE_ID, UpdateTransportLineRequest.builder()
                .name("Otro nombre")
                .operatorId(OPERATOR_ID.toString())
                .build());

        assertThat(response.getOperatorId()).isEqualTo(OPERATOR_ID);
    }
}
