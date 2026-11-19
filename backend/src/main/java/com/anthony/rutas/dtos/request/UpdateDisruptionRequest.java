package com.anthony.rutas.dtos.request;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDisruptionRequest {
    private String type;
    private String description;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private Boolean active;
}
