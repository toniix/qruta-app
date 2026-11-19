package com.anthony.rutas.billing;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.billing")
public class BillingProperties {
    private String webhookSecret;
}
