package com.anthony.rutas.dtos.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateOperatorLineRequest {
    private String name;
    private String code;
    private String color;
    private String company;
    private String contact;
    private String description;
    private String status;
}
