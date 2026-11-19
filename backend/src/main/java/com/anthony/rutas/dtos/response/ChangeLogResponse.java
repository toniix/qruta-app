package com.anthony.rutas.dtos.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeLogResponse {
    private UUID id;
    private String entityType;
    private UUID entityId;
    private String field;
    private String oldValue;
    private String newValue;
    private String authorEmail;
    private String authorRole;
    private LocalDateTime createdAt;
}
