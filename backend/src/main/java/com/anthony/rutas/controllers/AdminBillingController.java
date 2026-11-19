package com.anthony.rutas.controllers;

import com.anthony.rutas.billing.BillingMonthlyCloseService;
import com.anthony.rutas.dtos.response.BillingMonthlyCloseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/billing")
@RequiredArgsConstructor
public class AdminBillingController {

    private final BillingMonthlyCloseService billingMonthlyCloseService;

    @PostMapping("/monthly-close")
    public ResponseEntity<BillingMonthlyCloseResponse> monthlyClose() {
        return ResponseEntity.ok(billingMonthlyCloseService.run());
    }
}
