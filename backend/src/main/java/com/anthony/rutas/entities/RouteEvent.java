package com.anthony.rutas.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Raw, append-only usage event. Persisted exactly once by the ingestion endpoint and
 * never updated. The {@code deviceHash} is a daily-salted digest: no raw device id is
 * stored here (see {@code DeviceHasher}).
 */
@Entity
@Table(name = "route_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** When the event happened on the device. Partition key of the table. */
    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    /** When the server accepted the event. */
    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    @Column(name = "route_id")
    private UUID routeId;

    @Column(name = "stop_id")
    private UUID stopId;

    @Column(name = "transport_line_id")
    private UUID transportLineId;

    @Column(name = "city_id")
    private UUID cityId;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(name = "device_hash", nullable = false, length = 64)
    private String deviceHash;

    @Column(name = "qr_code_id")
    private UUID qrCodeId;

    /** Campaign carried by a physical QR code, so an operator can measure its return. */
    @Column(length = 255)
    private String campaign;
}
