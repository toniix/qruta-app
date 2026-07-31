package com.anthony.rutas.dtos.response;

import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteDetailResponse {
    private Long id;
    private String name;
    private String description;
    private Long transportLineId;
    private String transportLineName;
    private List<StopResponse> stops;
    private List<RoutePointResponse> routePoints;
}
