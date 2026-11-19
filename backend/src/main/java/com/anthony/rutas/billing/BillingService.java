package com.anthony.rutas.billing;

import com.anthony.rutas.dtos.request.BillingCheckoutRequest;
import com.anthony.rutas.dtos.request.BillingWebhookEvent;
import com.anthony.rutas.dtos.response.BillingCheckoutResponse;
import com.anthony.rutas.dtos.response.BillingWebhookResponse;
import com.anthony.rutas.dtos.response.SubscriptionPeriodResponse;
import com.anthony.rutas.dtos.response.SubscriptionResponse;
import com.anthony.rutas.entities.BillingEvent;
import com.anthony.rutas.entities.Operator;
import com.anthony.rutas.entities.Subscription;
import com.anthony.rutas.entities.SubscriptionPeriod;
import com.anthony.rutas.exceptions.BadRequestException;
import com.anthony.rutas.exceptions.ResourceNotFoundException;
import com.anthony.rutas.repositories.BillingEventRepository;
import com.anthony.rutas.repositories.OperatorRepository;
import com.anthony.rutas.repositories.SubscriptionPeriodRepository;
import com.anthony.rutas.repositories.SubscriptionRepository;
import com.anthony.rutas.security.OperatorScope;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingService {

    public static final String EVENT_PAYMENT_CONFIRMED = "payment.confirmed";
    public static final String EVENT_PAYMENT_FAILED = "payment.failed";
    public static final String EVENT_PAYMENT_EXPIRED = "payment.expired";

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPeriodRepository subscriptionPeriodRepository;
    private final BillingEventRepository billingEventRepository;
    private final OperatorRepository operatorRepository;
    private final PaymentProvider paymentProvider;
    private final SubscriptionCatalogService catalogService;
    private final SubscriptionStateMachine stateMachine;
    private final OperatorScope operatorScope;

    @Transactional
    public BillingCheckoutResponse createCheckout(BillingCheckoutRequest request) {
        UUID operatorId = operatorScope.requireOperatorId();
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found: " + operatorId));
        String plan = catalogService.normalize(
                request == null ? null : request.getPlan(), operator.getPlan());
        String method = normalizeMethod(request == null ? null : request.getMethod());
        Subscription subscription = subscriptionRepository.findByOperatorId(operatorId)
                .orElseGet(() -> createSubscription(operatorId, plan));

        Optional<SubscriptionPeriod> pending =
                subscriptionPeriodRepository.findFirstBySubscriptionIdAndStatusOrderByFromAtDesc(
                        subscription.getId(), SubscriptionPeriodStatus.PENDING);
        if (pending.isPresent()) {
            return checkoutResponse(subscription, pending.get(), plan, method);
        }

        LocalDateTime now = LocalDateTime.now();
        SubscriptionPeriod period = SubscriptionPeriod.builder()
                .subscriptionId(subscription.getId())
                .operatorId(operatorId)
                .fromAt(now)
                .toAt(now.plusDays(30))
                .amount(catalogService.amount(plan))
                .currency(catalogService.currency(plan))
                .method(method)
                .status(SubscriptionPeriodStatus.PENDING)
                .providerReference(UUID.randomUUID().toString())
                .build();
        period = subscriptionPeriodRepository.save(period);

        PaymentProvider.ProviderCheckout checkout = paymentProvider.createCheckout(
                operatorId, plan, method, period.getProviderReference());
        return BillingCheckoutResponse.builder()
                .subscriptionId(subscription.getId())
                .periodId(period.getId())
                .providerReference(checkout.providerReference())
                .checkoutUrl(checkout.checkoutUrl())
                .plan(plan)
                .method(method)
                .status(SubscriptionPeriodStatus.PENDING.name())
                .amount(checkout.amount())
                .currency(checkout.currency())
                .build();
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse getSubscription() {
        UUID operatorId = operatorScope.requireOperatorId();
        Subscription subscription = subscriptionRepository.findByOperatorId(operatorId).orElse(null);
        if (subscription == null) {
            return SubscriptionResponse.builder()
                    .subscriptionId(null)
                    .plan("PRO")
                    .status(SubscriptionStatus.ACTIVE.name())
                    .periods(List.of())
                    .build();
        }
        List<SubscriptionPeriodResponse> periods =
                subscriptionPeriodRepository.findBySubscriptionIdOrderByFromAtDesc(subscription.getId())
                        .stream()
                        .map(this::periodResponse)
                        .toList();
        return SubscriptionResponse.builder()
                .subscriptionId(subscription.getId())
                .plan(subscription.getPlan())
                .status(subscription.getStatus().name())
                .startsAt(subscription.getStartsAt())
                .renewsAt(subscription.getRenewsAt())
                .graceUntil(subscription.getGraceUntil())
                .periods(periods)
                .build();
    }

    @Transactional
    public BillingWebhookResponse processWebhook(BillingWebhookEvent event) {
        if (billingEventRepository.existsByProviderEventId(event.getEventId())) {
            return new BillingWebhookResponse(false, "DUPLICATE");
        }

        SubscriptionPeriod period = subscriptionPeriodRepository
                .findByProviderReference(event.getProviderReference())
                .orElseThrow(() -> new BadRequestException(
                        "Unknown provider reference: " + event.getProviderReference()));
        Subscription subscription = subscriptionRepository.findById(period.getSubscriptionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Subscription not found: " + period.getSubscriptionId()));

        LocalDateTime now = LocalDateTime.now();
        String resultingStatus;
        if (EVENT_PAYMENT_CONFIRMED.equals(event.getType())) {
            subscription.setStatus(stateMachine.transition(subscription.getStatus(), SubscriptionStatus.ACTIVE));
            subscription.setRenewsAt(now.plusDays(30));
            subscription.setGraceUntil(null);
            period.setStatus(SubscriptionPeriodStatus.PAID);
            resultingStatus = SubscriptionStatus.ACTIVE.name();
        } else if (EVENT_PAYMENT_FAILED.equals(event.getType()) || EVENT_PAYMENT_EXPIRED.equals(event.getType())) {
            subscription.setStatus(stateMachine.transition(subscription.getStatus(), SubscriptionStatus.PAST_DUE));
            subscription.setGraceUntil(now.plusDays(5));
            period.setStatus(SubscriptionPeriodStatus.FAILED);
            resultingStatus = SubscriptionStatus.PAST_DUE.name();
        } else {
            throw new BadRequestException("Unsupported billing event: " + event.getType());
        }

        subscriptionRepository.save(subscription);
        subscriptionPeriodRepository.save(period);
        billingEventRepository.save(BillingEvent.builder()
                .providerEventId(event.getEventId())
                .eventType(event.getType())
                .providerReference(event.getProviderReference())
                .payload(event.getData() == null ? Map.of() : event.getData())
                .processedAt(now)
                .build());
        return new BillingWebhookResponse(true, resultingStatus);
    }

    private Subscription createSubscription(UUID operatorId, String plan) {
        LocalDateTime now = LocalDateTime.now();
        return subscriptionRepository.save(Subscription.builder()
                .operatorId(operatorId)
                .plan(plan)
                .status(SubscriptionStatus.TRIAL)
                .startsAt(now)
                .renewsAt(now.plusDays(30))
                .build());
    }

    private BillingCheckoutResponse checkoutResponse(
            Subscription subscription, SubscriptionPeriod period, String plan, String method) {
        return BillingCheckoutResponse.builder()
                .subscriptionId(subscription.getId())
                .periodId(period.getId())
                .providerReference(period.getProviderReference())
                .checkoutUrl(paymentProvider.createCheckout(
                        subscription.getOperatorId(), plan, method, period.getProviderReference()).checkoutUrl())
                .plan(plan)
                .method(method)
                .status(period.getStatus().name())
                .amount(period.getAmount())
                .currency(period.getCurrency())
                .build();
    }

    private SubscriptionPeriodResponse periodResponse(SubscriptionPeriod period) {
        return SubscriptionPeriodResponse.builder()
                .id(period.getId())
                .operatorId(period.getOperatorId())
                .fromAt(period.getFromAt())
                .toAt(period.getToAt())
                .amount(period.getAmount().toPlainString())
                .currency(period.getCurrency())
                .method(period.getMethod())
                .status(period.getStatus().name())
                .providerReference(period.getProviderReference())
                .build();
    }

    private String normalizeMethod(String method) {
        if (!StringUtils.hasText(method)) {
            return "QR";
        }
        return method.trim().toUpperCase(Locale.ROOT);
    }
}
