package com.anthony.rutas.security;

import com.anthony.rutas.billing.BillingMonthlyCloseService;
import com.anthony.rutas.billing.BillingService;
import com.anthony.rutas.billing.BillingWebhookService;
import com.anthony.rutas.config.SecurityConfig;
import com.anthony.rutas.controllers.AdminBillingController;
import com.anthony.rutas.controllers.AdminOperatorController;
import com.anthony.rutas.controllers.AdminRouteController;
import com.anthony.rutas.controllers.BillingController;
import com.anthony.rutas.controllers.RouteController;
import com.anthony.rutas.dtos.response.BillingCheckoutResponse;
import com.anthony.rutas.dtos.response.BillingMonthlyCloseResponse;
import com.anthony.rutas.dtos.response.BillingWebhookResponse;
import com.anthony.rutas.services.AdminOperatorService;
import com.anthony.rutas.services.OperatorUserService;
import com.anthony.rutas.services.RouteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Guards the authorization boundary: everything under /api/admin/** must require
 * the ADMIN role, while the public catalog reads must stay open.
 *
 * Regression guard for the rule-ordering bug where `GET /api/**` permitAll was
 * declared before the `/api/admin/**` hasRole("ADMIN") matcher, leaving admin
 * read endpoints reachable without a token.
 */
@WebMvcTest(controllers = {
        AdminBillingController.class,
        AdminOperatorController.class,
        AdminRouteController.class,
        BillingController.class,
        RouteController.class
})
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class EndpointAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RouteService routeService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private CustomUserDetailsService userDetailsService;

    @MockBean
    private OperatorUserService operatorUserService;

    @MockBean
    private BillingService billingService;

    @MockBean
    private BillingWebhookService billingWebhookService;

    @MockBean
    private BillingMonthlyCloseService billingMonthlyCloseService;

    @MockBean
    private AdminOperatorService adminOperatorService;

    @Test
    void adminRouteListIsRejectedWithoutAuthentication() throws Exception {
        int status = mockMvc.perform(get("/api/admin/routes"))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(status)
                .as("GET /api/admin/routes must require the ADMIN role")
                .isIn(401, 403);
    }

    @Test
    void adminRouteDetailIsRejectedWithoutAuthentication() throws Exception {
        int status = mockMvc.perform(get("/api/admin/routes/00000000-0000-0000-0000-000000000000"))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(status)
                .as("GET /api/admin/routes/{id} must require the ADMIN role")
                .isIn(401, 403);
    }

    @Test
    void adminRouteListIsReachableForAdmin() throws Exception {
        stubAdminToken();
        when(routeService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/routes").header("Authorization", "Bearer admin-token"))
                .andExpect(status().isOk());
    }

    @Test
    void publicRouteCardsRemainOpen() throws Exception {
        when(routeService.findAllCards()).thenReturn(List.of());

        mockMvc.perform(get("/api/routes/cards"))
                .andExpect(status().isOk());
    }

    @Test
    void checkoutIsRejectedWithoutAuthentication() throws Exception {
        int status = mockMvc.perform(post("/api/billing/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(status).isIn(401, 403);
    }

    @Test
    void checkoutIsReachableForOperator() throws Exception {
        stubOperatorToken();
        when(billingService.createCheckout(any())).thenReturn(BillingCheckoutResponse.builder().build());

        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", "Bearer operator-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    void billingWebhookRemainsPublic() throws Exception {
        when(billingWebhookService.handle(eq("{}"), eq("test-signature")))
                .thenReturn(new BillingWebhookResponse(true, "ACTIVE"));

        mockMvc.perform(post("/api/billing/webhook")
                        .header("X-Signature", "test-signature")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    void monthlyCloseIsRejectedWithoutAuthentication() throws Exception {
        int status = mockMvc.perform(post("/api/admin/billing/monthly-close"))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(status).isIn(401, 403);
    }

    @Test
    void monthlyCloseIsReachableForAdmin() throws Exception {
        stubAdminToken();
        when(billingMonthlyCloseService.run()).thenReturn(new BillingMonthlyCloseResponse(0, 0, 0));

        mockMvc.perform(post("/api/admin/billing/monthly-close")
                        .header("Authorization", "Bearer admin-token"))
                .andExpect(status().isOk());
    }

    @Test
    void operatorManagementIsRejectedWithoutAuthentication() throws Exception {
        int status = mockMvc.perform(get("/api/admin/operators"))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(status)
                .as("GET /api/admin/operators must require the ADMIN role")
                .isIn(401, 403);
    }

    @Test
    void operatorManagementIsReachableForAdmin() throws Exception {
        stubAdminToken();
        when(adminOperatorService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/operators").header("Authorization", "Bearer admin-token"))
                .andExpect(status().isOk());
    }

    private void stubOperatorToken() {
        UserDetails operator = new User(
                "operator@rutasya.pe",
                "irrelevant",
                List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));

        when(jwtUtil.validateToken("operator-token")).thenReturn(true);
        when(jwtUtil.extractUsername("operator-token")).thenReturn("operator@rutasya.pe");
        when(userDetailsService.loadUserByUsername("operator@rutasya.pe")).thenReturn(operator);
    }

    private void stubAdminToken() {
        UserDetails admin = new User(
                "admin@rutasya.pe",
                "irrelevant",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        when(jwtUtil.validateToken("admin-token")).thenReturn(true);
        when(jwtUtil.extractUsername("admin-token")).thenReturn("admin@rutasya.pe");
        when(userDetailsService.loadUserByUsername("admin@rutasya.pe")).thenReturn(admin);
    }
}
