package com.anthony.rutas.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "transport_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransportLine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id", nullable = false)
    private City city;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operator_id")
    private Operator operator;

    @Column(nullable = false)
    private String name;

    @Column(length = 20)
    private String code;

    private String color;

    private String company;

    private String contact;

    private String description;

    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void setCompany(String company) {
        this.company = company;
        if (company != null) {
            this.name = company;
        }
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        syncLegacyName();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        syncLegacyName();
    }

    private void syncLegacyName() {
        if (this.name == null && this.company != null) {
            this.name = this.company;
        }
    }

    public static class TransportLineBuilder {
        public TransportLineBuilder company(String company) {
            this.company = company;
            if (company != null && this.name == null) {
                this.name = company;
            }
            return this;
        }
    }

    @OneToMany(mappedBy = "transportLine", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Route> routes = new ArrayList<>();
}
