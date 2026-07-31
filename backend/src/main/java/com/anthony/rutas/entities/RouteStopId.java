package com.anthony.rutas.entities;

import lombok.*;
import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class RouteStopId implements Serializable {

    private Long route;
    private Long stop;
}
