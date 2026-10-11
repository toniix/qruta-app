package com.anthony.rutas.config;

import com.anthony.rutas.entities.*;
import com.anthony.rutas.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AdministratorRepository administratorRepository;
    private final CommunityPostRepository communityPostRepository;
    private final CommunityCommentRepository communityCommentRepository;
    private final RouteRepository routeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (administratorRepository.count() == 0) {
            Administrator defaultAdmin = Administrator.builder()
                    .fullName("Administrador Sistema")
                    .email("admin@rutasya.pe")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .active(true)
                    .build();
            administratorRepository.save(defaultAdmin);
            log.info("Administrador por defecto creado: admin@rutasya.pe / admin123");
        }

        if (communityPostRepository.count() == 0) {
            seedCommunityPosts();
        }
    }

    private void seedCommunityPosts() {
        try {
            List<Route> allRoutes = routeRepository.findAll();
            Route route1 = allRoutes.stream()
                    .filter(r -> r.getCode() != null && r.getCode().toUpperCase().contains("ICA"))
                    .findFirst()
                    .orElse(allRoutes.isEmpty() ? null : allRoutes.get(0));

            Route route2 = allRoutes.size() > 1 ? allRoutes.get(1) : route1;

            CommunityPost post1 = CommunityPost.builder()
                    .authorAlias("Carlos M.")
                    .authorDeviceId("seed-device-1")
                    .category(PostCategory.ALERTA)
                    .content("Tráfico lento cerca de Av. Los Maestros frente a El Quinde por obras en la vía. Tomen precauciones.")
                    .route(route1)
                    .likesCount(5)
                    .commentsCount(2)
                    .createdAt(LocalDateTime.now().minusMinutes(25))
                    .build();

            CommunityPost post2 = CommunityPost.builder()
                    .authorAlias("Lucía Vargas")
                    .authorDeviceId("seed-device-2")
                    .category(PostCategory.PREGUNTA)
                    .content("¿Alguien sabe hasta qué hora están pasando las unidades hacia la UNICA hoy por la noche?")
                    .route(route2)
                    .likesCount(3)
                    .commentsCount(1)
                    .createdAt(LocalDateTime.now().minusHours(1))
                    .build();

            CommunityPost post3 = CommunityPost.builder()
                    .authorAlias("Jorge R.")
                    .authorDeviceId("seed-device-3")
                    .category(PostCategory.RECOMENDACION)
                    .content("Las unidades están pasando súper puntuales cada 8-10 minutos en hora punta por el centro.")
                    .route(route1)
                    .likesCount(7)
                    .commentsCount(0)
                    .createdAt(LocalDateTime.now().minusHours(3))
                    .build();

            List<CommunityPost> savedPosts = communityPostRepository.saveAll(List.of(post1, post2, post3));

            CommunityComment c1 = CommunityComment.builder()
                    .post(savedPosts.get(0))
                    .authorAlias("Pedro Ica")
                    .authorDeviceId("seed-device-4")
                    .content("Confirmo, están desviando una cuadra antes de llegar al centro comercial.")
                    .createdAt(LocalDateTime.now().minusMinutes(18))
                    .build();

            CommunityComment c2 = CommunityComment.builder()
                    .post(savedPosts.get(0))
                    .authorAlias("Ana Torres")
                    .authorDeviceId("seed-device-5")
                    .content("¡Gracias por el dato! Mejor bajo en el paradero anterior.")
                    .createdAt(LocalDateTime.now().minusMinutes(10))
                    .build();

            CommunityComment c3 = CommunityComment.builder()
                    .post(savedPosts.get(1))
                    .authorAlias("Diego UNICA")
                    .authorDeviceId("seed-device-6")
                    .content("Normalmente pasan hasta las 9:30 pm por el Mercado Modelo.")
                    .createdAt(LocalDateTime.now().minusMinutes(40))
                    .build();

            communityCommentRepository.saveAll(List.of(c1, c2, c3));
            log.info("Publicaciones iniciales de Comunidad creadas ({})", savedPosts.size());
        } catch (Exception e) {
            log.warn("No se pudieron crear datos semilla de comunidad: {}", e.getMessage());
        }
    }
}

