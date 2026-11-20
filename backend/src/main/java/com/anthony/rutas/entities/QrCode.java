package com.anthony.rutas.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "qr_codes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QrCode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType; // HOME, ROUTE, STOP, CAMPAIGN

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "campaign_source", length = 60)
    private String campaignSource;

    @Column(name = "campaign_medium", length = 60)
    private String campaignMedium;

    @Column(name = "campaign_name", length = 100)
    private String campaignName;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, PAUSED, REVOKED

    @Column(name = "operator_id")
    private UUID operatorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operator_id", insertable = false, updatable = false)
    private Operator operator;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
