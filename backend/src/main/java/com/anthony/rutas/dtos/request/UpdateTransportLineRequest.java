package com.anthony.rutas.dtos.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTransportLineRequest {
    private String company;
    private String color;
    private String contact;
    private String description;
    private String status;

    /**
     * Optional operator assignment. A non-null value assigns (must exist and be
     * active); null clears the current assignment. The admin form always sends
     * this field, so null is the explicit "clear" signal.
     */
    private String operatorId;
}
