package com.anthony.rutas;

import com.anthony.rutas.support.RequiresTestDatabase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Verifies that the application context starts with the test profile.
 *
 * <p>Needs a real PostgreSQL database with PostGIS (rutas_test) and is skipped
 * when it is not available. See application-test.properties.
 */
@SpringBootTest
@ActiveProfiles("test")
@RequiresTestDatabase
class RutasApplicationTests {

	@Test
	void contextLoads() {
	}

}
