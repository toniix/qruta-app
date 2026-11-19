package com.anthony.rutas.billing;

import com.anthony.rutas.dtos.request.BillingWebhookEvent;
import com.anthony.rutas.dtos.response.BillingWebhookResponse;
import com.anthony.rutas.exceptions.BadRequestException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class BillingWebhookService {

    private final BillingWebhookVerifier verifier;
    private final BillingService billingService;
    private final ObjectMapper objectMapper;

    public BillingWebhookResponse handle(String rawBody, String signature) {
        verifier.verify(rawBody, signature);
        BillingWebhookEvent event;
        try {
            event = objectMapper.readValue(rawBody, BillingWebhookEvent.class);
        } catch (JsonProcessingException exception) {
            throw new BadRequestException("Invalid billing webhook payload");
        }
        if (event == null
                || !StringUtils.hasText(event.getEventId())
                || !StringUtils.hasText(event.getType())
                || !StringUtils.hasText(event.getProviderReference())) {
            throw new BadRequestException("Billing webhook payload is incomplete");
        }
        return billingService.processWebhook(event);
    }
}
