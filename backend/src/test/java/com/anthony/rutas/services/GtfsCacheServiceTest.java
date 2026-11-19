package com.anthony.rutas.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GtfsCacheServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void returnsSameBytesForSameCityAndVersion() {
        GtfsCacheService cache = new GtfsCacheService(tempDir, Duration.ofMinutes(15));
        byte[] feed = "zip-bytes".getBytes();

        cache.put("lima", "v1", feed);
        Optional<byte[]> cached = cache.get("lima", "v1");

        assertTrue(cached.isPresent());
        assertArrayEquals(feed, cached.get());
    }

    @Test
    void deletesStaleVersionsForSameCity() throws Exception {
        GtfsCacheService cache = new GtfsCacheService(tempDir, Duration.ofMinutes(15));
        cache.put("lima", "v1", "old".getBytes());
        cache.put("lima", "v2", "new".getBytes());

        assertFalse(cache.get("lima", "v1").isPresent());
        assertTrue(Files.list(tempDir).noneMatch(path -> path.getFileName().toString().startsWith("lima-v1")));
        assertTrue(cache.get("lima", "v2").isPresent());
    }

    @Test
    void expiresEntriesAfterTtl() throws Exception {
        GtfsCacheService cache = new GtfsCacheService(tempDir, Duration.ofNanos(1));
        cache.put("lima", "v1", "old".getBytes());
        Thread.sleep(5);

        assertTrue(cache.get("lima", "v1").isEmpty());
    }
}
