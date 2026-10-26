package com.anthony.rutas.support;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Enables a test class only when the local test database accepts connections.
 *
 * <p>Evaluated before Spring builds an application context, so an unavailable
 * database produces a skip instead of a connection failure. The connection
 * attempt is bounded by a short login timeout.
 */
class TestDatabaseCondition implements ExecutionCondition {

    private static final String DEFAULT_URL = "jdbc:postgresql://localhost:5432/rutas_test";
    private static final String DEFAULT_USER = "postgres";
    private static final String DEFAULT_PASSWORD = "postgres";

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        String url = System.getProperty("test.db.url", DEFAULT_URL);
        String user = System.getenv().getOrDefault("TEST_DB_USERNAME", DEFAULT_USER);
        String password = System.getenv().getOrDefault("TEST_DB_PASSWORD", DEFAULT_PASSWORD);

        try {
            DriverManager.setLoginTimeout(2);
            try (Connection ignored = DriverManager.getConnection(url, user, password)) {
                return ConditionEvaluationResult.enabled("Test database reachable at " + url);
            }
        } catch (SQLException e) {
            return ConditionEvaluationResult.disabled(
                    "Skipped: test database unreachable at " + url + " (" + e.getMessage() + ")");
        }
    }
}
