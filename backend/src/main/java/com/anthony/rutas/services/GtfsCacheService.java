package com.anthony.rutas.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class GtfsCacheService {

    private final Path cacheDir;
    private final Duration ttl;

    @Autowired
    public GtfsCacheService(
            @Value("${app.gtfs.cache-dir:${java.io.tmpdir}/qruta-gtfs}") String cacheDir,
            @Value("${app.gtfs.ttl-minutes:15}") long ttlMinutes) {
        this(Path.of(cacheDir), Duration.ofMinutes(ttlMinutes));
    }

    public GtfsCacheService(Path cacheDir, Duration ttl) {
        this.cacheDir = cacheDir;
        this.ttl = ttl;
    }

    public Optional<byte[]> get(String citySlug, String catalogVersion) {
        Path file = path(citySlug, catalogVersion);
        if (!Files.isRegularFile(file)) {
            return Optional.empty();
        }
        try {
            Instant modified = Files.getLastModifiedTime(file).toInstant();
            if (modified.isBefore(Instant.now().minus(ttl))) {
                Files.deleteIfExists(file);
                return Optional.empty();
            }
            return Optional.of(Files.readAllBytes(file));
        } catch (IOException exception) {
            return Optional.empty();
        }
    }

    public void put(String citySlug, String catalogVersion, byte[] feed) {
        Path file = path(citySlug, catalogVersion);
        Path temporary = file.resolveSibling(file.getFileName() + ".tmp");
        try {
            Files.createDirectories(cacheDir);
            Files.write(temporary, feed);
            try {
                Files.move(temporary, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporary, file, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Could not cache GTFS feed", exception);
        }
        deleteStale(citySlug, file);
    }

    private Path path(String citySlug, String catalogVersion) {
        String safeSlug = citySlug == null ? "" : citySlug.replaceAll("[^a-z0-9-]", "");
        String safeVersion = catalogVersion == null ? "" : catalogVersion.replaceAll("[^A-Za-z0-9_-]", "");
        return cacheDir.resolve(safeSlug + "-" + safeVersion + ".zip").normalize();
    }

    private void deleteStale(String citySlug, Path keep) {
        String safeSlug = citySlug == null ? "" : citySlug.replaceAll("[^a-z0-9-]", "");
        if (!Files.isDirectory(cacheDir)) {
            return;
        }
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(cacheDir, safeSlug + "-*.zip")) {
            for (Path candidate : stream) {
                if (!candidate.equals(keep)) {
                    Files.deleteIfExists(candidate);
                }
            }
        } catch (IOException ignored) {
        }
    }
}
