package com.anthony.rutas.controllers;

import com.anthony.rutas.services.GtfsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gtfs")
@RequiredArgsConstructor
public class GtfsController {

    private final GtfsService gtfsService;

    @GetMapping("/{citySlug:[^.]+}.zip")
    public ResponseEntity<byte[]> download(@PathVariable String citySlug) {
        byte[] feed = gtfsService.getFeed(citySlug);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/zip")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"gtfs-" + citySlug + ".zip\"")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=900")
                .body(feed);
    }
}
