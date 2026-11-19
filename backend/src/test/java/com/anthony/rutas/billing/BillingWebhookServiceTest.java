package com.anthony.rutas.billing;

import com.anthony.rutas.dtos.request.BillingWebhookEvent;
import com.anthony.rutas.dtos.response.BillingWebhookResponse;
import com.anthony.rutas.exceptions.BadRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingWebhookServiceTest {

    @Mock
    private BillingWebhookVerifier verifier;

    @Mock
    private BillingService billingService;

    private BillingWebhookService service;

    @BeforeEach
    void setUp() {
        service = new BillingWebhookService(verifier, billingService, new ObjectMapper());
    }

    @Test
    void parsesAliasedPayloadAndDelegates() {
        String body = """
                {
                  "event_id": "evt-1",
                  "type": "payment.confirmed",
                  "provider_reference": "provider-ref-1",
                  "data": {"invoice": "INV-1"}
                }
                """;
        when(billingService.processWebhook(any())).thenReturn(new BillingWebhookResponse(true, "ACTIVE"));

        BillingWebhookResponse response = service.handle(body, "signature");

        assertThat(response.isProcessed()).isTrue();
        ArgumentCaptor<BillingWebhookEvent> captor = ArgumentCaptor.forClass(BillingWebhookEvent.class);
        verify(billingService).processWebhook(captor.capture());
        assertThat(captor.getValue().getEventId()).isEqualTo("evt-1");
        assertThat(captor.getValue().getType()).isEqualTo("payment.confirmed");
        assertThat(captor.getValue().getProviderReference()).isEqualTo("provider-ref-1");
        assertThat(captor.getValue().getData()).containsEntry("invoice", "INV-1");
    }

    @Test
    void rejectsBeforeParsingWhenSignatureIsInvalid() {
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED))
                .when(verifier).verify("{}", "bad");

        assertThrows(ResponseStatusException.class, () -> service.handle("{}", "bad"));
        verifyNoInteractions(billingService);
    }

    @Test
    void rejectsMalformedJson() {
        assertThrows(BadRequestException.class, () -> service.handle("{", "signature"));
        verifyNoInteractions(billingService);
    }

    @Test
    void rejectsIncompletePayload() {
        assertThrows(BadRequestException.class,
                () -> service.handle("{\"eventId\":\"evt-1\"}", "signature"));
        verifyNoInteractions(billingService);
    }
}
