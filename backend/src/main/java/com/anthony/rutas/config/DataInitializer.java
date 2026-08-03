package com.anthony.rutas.config;

import com.anthony.rutas.entities.Administrator;
import com.anthony.rutas.repositories.AdministratorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AdministratorRepository administratorRepository;
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
    }
}
