package com.anthony.rutas.dtos.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisruptionResponse {
    private UUID id;
    private UUID routeId;
    private String routeCode;
    private String routeName;
    private String type;
    private String description;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private boolean active;
}
