package com.anthony.rutas.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "data_api_keys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "key_hash", nullable = false, unique = true, length = 64)
    private String keyHash;

    @Column(name = "client_name", nullable = false)
    private String clientName;

    @Column(nullable = false)
    private String plan;

    @Column(name = "monthly_quota", nullable = false)
    private int monthlyQuota;

    @Column(name = "used_this_period", nullable = false)
    @Builder.Default
    private int usedThisPeriod = 0;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "operator_id")
    private UUID operatorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "data_license_id", nullable = false)
    private DataLicense license;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (periodStart == null) {
            periodStart = YearMonth.now(ZoneOffset.UTC).atDay(1);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
