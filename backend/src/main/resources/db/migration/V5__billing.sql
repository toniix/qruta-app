CREATE TABLE public.subscriptions (
    id uuid NOT NULL,
    operator_id uuid NOT NULL,
    plan character varying(20) NOT NULL DEFAULT 'PRO',
    status character varying(20) NOT NULL DEFAULT 'TRIAL',
    starts_at timestamp(6) without time zone NOT NULL,
    renews_at timestamp(6) without time zone,
    grace_until timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT subscriptions_operator_id_key UNIQUE (operator_id),
    CONSTRAINT subscriptions_plan_check CHECK (plan IN ('PRO')),
    CONSTRAINT subscriptions_status_check CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED'))
);

CREATE TABLE public.subscription_periods (
    id uuid NOT NULL,
    subscription_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    from_at timestamp(6) without time zone NOT NULL,
    to_at timestamp(6) without time zone NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) NOT NULL DEFAULT 'PEN',
    method character varying(20) NOT NULL DEFAULT 'QR',
    status character varying(20) NOT NULL DEFAULT 'PENDING',
    provider_reference character varying(100) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT subscription_periods_pkey PRIMARY KEY (id),
    CONSTRAINT subscription_periods_provider_reference_key UNIQUE (provider_reference),
    CONSTRAINT subscription_periods_status_check CHECK (status IN ('PENDING', 'PAID', 'FAILED'))
);

CREATE TABLE public.billing_events (
    id uuid NOT NULL,
    provider_event_id character varying(100) NOT NULL,
    event_type character varying(50) NOT NULL,
    provider_reference character varying(100),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    processed_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT billing_events_pkey PRIMARY KEY (id),
    CONSTRAINT billing_events_provider_event_id_key UNIQUE (provider_event_id)
);

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT fk_subscriptions_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subscription_periods
    ADD CONSTRAINT fk_subscription_periods_subscription FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subscription_periods
    ADD CONSTRAINT fk_subscription_periods_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;

CREATE INDEX idx_subscription_periods_subscription_id ON public.subscription_periods USING btree (subscription_id);

CREATE INDEX idx_subscription_periods_operator_id ON public.subscription_periods USING btree (operator_id);

CREATE INDEX idx_billing_events_provider_event_id ON public.billing_events USING btree (provider_event_id);
