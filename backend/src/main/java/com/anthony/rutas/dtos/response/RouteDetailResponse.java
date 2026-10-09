package com.anthony.rutas.dtos.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteDetailResponse {
    private UUID id;
    private String code;
    private String name;
    private String color;
    private String fare;
    private TransportLineInfo transportLine;
    private String description;
    private ScheduleInfo schedule;
    private String status;
    private List<RouteDirectionResponse> directions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TransportLineInfo {
        private UUID id;
        private String name;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScheduleInfo {
        private String hours;
        private String frequency;
    }
}
