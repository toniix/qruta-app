package com.anthony.rutas.support;

import org.junit.jupiter.api.extension.ExtendWith;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Skips a test class when the local test database (rutas_test) is unreachable.
 *
 * <p>Keeps `mvn test` green on machines and CI runners without PostgreSQL, while
 * still running the database-backed tests wherever the database does exist.
 * The reason appears in the JUnit report, so a skip is never silent.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@ExtendWith(TestDatabaseCondition.class)
public @interface RequiresTestDatabase {
}
