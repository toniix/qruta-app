package com.anthony.rutas.billing;

import com.anthony.rutas.dtos.request.BillingCheckoutRequest;
import com.anthony.rutas.dtos.request.BillingWebhookEvent;
import com.anthony.rutas.dtos.response.BillingCheckoutResponse;
import com.anthony.rutas.dtos.response.BillingWebhookResponse;
import com.anthony.rutas.dtos.response.SubscriptionResponse;
import com.anthony.rutas.entities.BillingEvent;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.Subscription;
import com.anthony.rutas.entities.SubscriptionPeriod;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.repositories.BillingEventRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.SubscriptionPeriodRepository;
import com.anthony.rutas.repositories.SubscriptionRepository;
import com.anthony.rutas.security.OperatorScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {

    private static final UUID OPERATOR_ID = UUID.randomUUID();
    private static final UUID SUBSCRIPTION_ID = UUID.randomUUID();
    private static final UUID PERIOD_ID = UUID.randomUUID();
    private static final String PROVIDER_REFERENCE = "provider-ref-1";
    private static final String CHECKOUT_URL = "https://pay.simulado.test/checkout/token";

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private SubscriptionPeriodRepository subscriptionPeriodRepository;

    @Mock
    private BillingEventRepository billingEventRepository;

    @Mock
    private OperatorRepository operatorRepository;

    @Mock
    private PaymentProvider paymentProvider;

    @Mock
    private OperatorScope operatorScope;

    private BillingService service;

    @BeforeEach
    void setUp() {
        service = new BillingService(
                subscriptionRepository,
                subscriptionPeriodRepository,
                billingEventRepository,
                operatorRepository,
                paymentProvider,
                new SubscriptionCatalogService(),
                new SubscriptionStateMachine(),
                operatorScope);
    }

    @Test
    void createCheckoutCreatesTrialSubscriptionAndPendingPeriod() {
        when(operatorScope.requireOperatorId()).thenReturn(OPERATOR_ID);
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(subscriptionRepository.findByOperatorId(OPERATOR_ID)).thenReturn(Optional.empty());
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(invocation -> {
            Subscription subscription = invocation.getArgument(0);
            subscription.setId(SUBSCRIPTION_ID);
            return subscription;
        });
        when(subscriptionPeriodRepository
                .findFirstBySubscriptionIdAndStatusOrderByFromAtDesc(SUBSCRIPTION_ID, SubscriptionPeriodStatus.PENDING))
                .thenReturn(Optional.empty());
        when(subscriptionPeriodRepository.save(any(SubscriptionPeriod.class))).thenAnswer(invocation -> {
            SubscriptionPeriod period = invocation.getArgument(0);
            period.setId(PERIOD_ID);
            return period;
        });
        when(paymentProvider.createCheckout(eq(OPERATOR_ID), eq("PRO"), eq("QR"), anyString()))
                .thenAnswer(invocation -> new PaymentProvider.ProviderCheckout(
                        invocation.getArgument(3), CHECKOUT_URL, new BigDecimal("49.00"), "PEN"));

        BillingCheckoutResponse response = service.createCheckout(
                BillingCheckoutRequest.builder().plan("pro").build());

        assertThat(response.getSubscriptionId()).isEqualTo(SUBSCRIPTION_ID);
        assertThat(response.getPeriodId()).isEqualTo(PERIOD_ID);
        assertThat(response.getCheckoutUrl()).isEqualTo(CHECKOUT_URL);
        assertThat(response.getPlan()).isEqualTo("PRO");
        assertThat(response.getMethod()).isEqualTo("QR");
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getAmount()).isEqualByComparingTo("49.00");
        assertThat(response.getCurrency()).isEqualTo("PEN");
        assertThat(response.getProviderReference()).isNotBlank();

        ArgumentCaptor<SubscriptionPeriod> periodCaptor = ArgumentCaptor.forClass(SubscriptionPeriod.class);
        verify(subscriptionPeriodRepository).save(periodCaptor.capture());
        assertThat(periodCaptor.getValue().getStatus()).isEqualTo(SubscriptionPeriodStatus.PENDING);
        assertThat(periodCaptor.getValue().getSubscriptionId()).isEqualTo(SUBSCRIPTION_ID);
        assertThat(periodCaptor.getValue().getOperatorId()).isEqualTo(OPERATOR_ID);
    }

    @Test
    void createCheckoutReusesPendingPeriod() {
        when(operatorScope.requireOperatorId()).thenReturn(OPERATOR_ID);
        when(operatorRepository.findById(OPERATOR_ID)).thenReturn(Optional.of(operator()));
        when(subscriptionRepository.findByOperatorId(OPERATOR_ID)).thenReturn(Optional.of(subscription(SubscriptionStatus.TRIAL)));
        when(subscriptionPeriodRepository
                .findFirstBySubscriptionIdAndStatusOrderByFromAtDesc(SUBSCRIPTION_ID, SubscriptionPeriodStatus.PENDING))
                .thenReturn(Optional.of(pendingPeriod()));
        when(paymentProvider.createCheckout(eq(OPERATOR_ID), eq("PRO"), eq("QR"), eq(PROVIDER_REFERENCE)))
                .thenReturn(new PaymentProvider.ProviderCheckout(
                        PROVIDER_REFERENCE, CHECKOUT_URL, new BigDecimal("49.00"), "PEN"));

        BillingCheckoutResponse response = service.createCheckout(null);

        assertThat(response.getProviderReference()).isEqualTo(PROVIDER_REFERENCE);
        assertThat(response.getStatus()).isEqualTo("PENDING");
        verify(subscriptionRepository, never()).save(any());
        verify(subscriptionPeriodRepository, never()).save(any());
    }

    @Test
    void getSubscriptionReturnsSyntheticActiveForNewOperator() {
        when(operatorScope.requireOperatorId()).thenReturn(OPERATOR_ID);
        when(subscriptionRepository.findByOperatorId(OPERATOR_ID)).thenReturn(Optional.empty());

        SubscriptionResponse response = service.getSubscription();

        assertThat(response.getSubscriptionId()).isNull();
        assertThat(response.getPlan()).isEqualTo("PRO");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        assertThat(response.getPeriods()).isEmpty();
    }

    @Test
    void getSubscriptionMapsPersistedPeriods() {
        Subscription subscription = subscription(SubscriptionStatus.PAST_DUE);
        when(operatorScope.requireOperatorId()).thenReturn(OPERATOR_ID);
        when(subscriptionRepository.findByOperatorId(OPERATOR_ID)).thenReturn(Optional.of(subscription));
        when(subscriptionPeriodRepository.findBySubscriptionIdOrderByFromAtDesc(SUBSCRIPTION_ID))
                .thenReturn(List.of(paidPeriod()));

        SubscriptionResponse response = service.getSubscription();

        assertThat(response.getSubscriptionId()).isEqualTo(SUBSCRIPTION_ID);
        assertThat(response.getStatus()).isEqualTo("PAST_DUE");
        assertThat(response.getPeriods()).hasSize(1);
        assertThat(response.getPeriods().get(0).getStatus()).isEqualTo("PAID");
        assertThat(response.getPeriods().get(0).getAmount()).isEqualTo("49.00");
    }

    @Test
    void confirmedPaymentActivatesSubscription() {
        BillingWebhookEvent event = webhookEvent(BillingService.EVENT_PAYMENT_CONFIRMED);
        Subscription subscription = subscription(SubscriptionStatus.TRIAL);
        SubscriptionPeriod period = pendingPeriod();
        when(billingEventRepository.existsByProviderEventId(event.getEventId())).thenReturn(false);
        when(subscriptionPeriodRepository.findByProviderReference(PROVIDER_REFERENCE))
                .thenReturn(Optional.of(period));
        when(subscriptionRepository.findById(SUBSCRIPTION_ID)).thenReturn(Optional.of(subscription));

        BillingWebhookResponse response = service.processWebhook(event);

        assertThat(response.isProcessed()).isTrue();
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(subscription.getGraceUntil()).isNull();
        assertThat(subscription.getRenewsAt()).isNotNull();
        assertThat(period.getStatus()).isEqualTo(SubscriptionPeriodStatus.PAID);
        verify(subscriptionRepository).save(subscription);
        verify(subscriptionPeriodRepository).save(period);
        verify(billingEventRepository).save(any(BillingEvent.class));
    }

    @Test
    void failedPaymentMarksSubscriptionPastDue() {
        BillingWebhookEvent event = webhookEvent(BillingService.EVENT_PAYMENT_FAILED);
        Subscription subscription = subscription(SubscriptionStatus.ACTIVE);
        SubscriptionPeriod period = pendingPeriod();
        when(billingEventRepository.existsByProviderEventId(event.getEventId())).thenReturn(false);
        when(subscriptionPeriodRepository.findByProviderReference(PROVIDER_REFERENCE))
                .thenReturn(Optional.of(period));
        when(subscriptionRepository.findById(SUBSCRIPTION_ID)).thenReturn(Optional.of(subscription));

        BillingWebhookResponse response = service.processWebhook(event);

        assertThat(response.getStatus()).isEqualTo("PAST_DUE");
        assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
        assertThat(subscription.getGraceUntil()).isNotNull();
        assertThat(period.getStatus()).isEqualTo(SubscriptionPeriodStatus.FAILED);
    }

    @Test
    void repeatedWebhookIsIgnored() {
        BillingWebhookEvent event = webhookEvent(BillingService.EVENT_PAYMENT_CONFIRMED);
        when(billingEventRepository.existsByProviderEventId(event.getEventId())).thenReturn(true);

        BillingWebhookResponse response = service.processWebhook(event);

        assertThat(response.isProcessed()).isFalse();
        assertThat(response.getStatus()).isEqualTo("DUPLICATE");
        verifyNoInteractions(subscriptionRepository, subscriptionPeriodRepository, operatorRepository,
                paymentProvider, operatorScope);
    }

    @Test
    void webhookWithUnknownReferenceIsRejected() {
        BillingWebhookEvent event = webhookEvent(BillingService.EVENT_PAYMENT_CONFIRMED);
        when(billingEventRepository.existsByProviderEventId(event.getEventId())).thenReturn(false);
        when(subscriptionPeriodRepository.findByProviderReference(PROVIDER_REFERENCE)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> service.processWebhook(event));
    }

    @Test
    void webhookWithUnsupportedTypeIsRejected() {
        BillingWebhookEvent event = webhookEvent("subscription.whatever");
        Subscription subscription = subscription(SubscriptionStatus.ACTIVE);
        when(billingEventRepository.existsByProviderEventId(event.getEventId())).thenReturn(false);
        when(subscriptionPeriodRepository.findByProviderReference(PROVIDER_REFERENCE))
                .thenReturn(Optional.of(pendingPeriod()));
        when(subscriptionRepository.findById(SUBSCRIPTION_ID)).thenReturn(Optional.of(subscription));

        assertThrows(BadRequestException.class, () -> service.processWebhook(event));
        verify(subscriptionRepository, never()).save(any());
        verify(billingEventRepository, never()).save(any());
    }

    private Operator operator() {
        return Operator.builder().id(OPERATOR_ID).plan("PRO").build();
    }

    private Subscription subscription(SubscriptionStatus status) {
        return Subscription.builder()
                .id(SUBSCRIPTION_ID)
                .operatorId(OPERATOR_ID)
                .plan("PRO")
                .status(status)
                .startsAt(LocalDateTime.now().minusDays(1))
                .build();
    }

    private SubscriptionPeriod pendingPeriod() {
        return SubscriptionPeriod.builder()
                .id(PERIOD_ID)
                .subscriptionId(SUBSCRIPTION_ID)
                .operatorId(OPERATOR_ID)
                .fromAt(LocalDateTime.now())
                .toAt(LocalDateTime.now().plusDays(30))
                .amount(new BigDecimal("49.00"))
                .currency("PEN")
                .method("QR")
                .status(SubscriptionPeriodStatus.PENDING)
                .providerReference(PROVIDER_REFERENCE)
                .build();
    }

    private SubscriptionPeriod paidPeriod() {
        SubscriptionPeriod period = pendingPeriod();
        period.setStatus(SubscriptionPeriodStatus.PAID);
        return period;
    }

    private BillingWebhookEvent webhookEvent(String type) {
        return BillingWebhookEvent.builder()
                .eventId("evt-1")
                .type(type)
                .providerReference(PROVIDER_REFERENCE)
                .data(Map.of("source", "test"))
                .build();
    }
}
