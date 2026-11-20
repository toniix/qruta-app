package com.anthony.rutas.dtos.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateOperatorLineRequest {
    private String color;
    private String contact;
    private String description;
    private String status;
}
