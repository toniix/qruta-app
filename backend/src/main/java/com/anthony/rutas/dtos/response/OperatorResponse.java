package com.anthony.rutas.dtos.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatorResponse {
    private UUID id;
    private String name;
    private String ruc;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private UUID cityId;
    private String cityName;
    private String plan;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
