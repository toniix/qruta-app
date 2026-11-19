package com.anthony.rutas.controllers;

import com.anthony.rutas.billing.BillingService;
import com.anthony.rutas.billing.BillingWebhookService;
import com.anthony.rutas.dtos.request.BillingCheckoutRequest;
import com.anthony.rutas.dtos.response.BillingCheckoutResponse;
import com.anthony.rutas.dtos.response.BillingWebhookResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;
    private final BillingWebhookService billingWebhookService;

    @PostMapping("/checkout")
    public ResponseEntity<BillingCheckoutResponse> checkout(
            @Valid @RequestBody(required = false) BillingCheckoutRequest request) {
        return ResponseEntity.ok(billingService.createCheckout(request));
    }

    @PostMapping("/webhook")
    public ResponseEntity<BillingWebhookResponse> webhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Signature", required = false) String signature) {
        return ResponseEntity.ok(billingWebhookService.handle(rawBody, signature));
    }
}
