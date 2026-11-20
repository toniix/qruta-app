CREATE TABLE public.data_licenses (
    id uuid NOT NULL,
    client_name character varying(255) NOT NULL,
    plan character varying(20) NOT NULL,
    conditions character varying(2000),
    valid_from date NOT NULL,
    valid_until date NOT NULL,
    monthly_quota integer NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT data_licenses_pkey PRIMARY KEY (id),
    CONSTRAINT data_licenses_plan_check CHECK (plan IN ('BASIC', 'PRO', 'ENTERPRISE')),
    CONSTRAINT data_licenses_monthly_quota_check CHECK (monthly_quota > 0)
);

CREATE TABLE public.data_api_keys (
    id uuid NOT NULL,
    key_hash character varying(64) NOT NULL,
    client_name character varying(255) NOT NULL,
    plan character varying(20) NOT NULL,
    monthly_quota integer NOT NULL,
    used_this_period integer NOT NULL DEFAULT 0,
    period_start date NOT NULL,
    active boolean NOT NULL DEFAULT true,
    operator_id uuid,
    data_license_id uuid NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    last_used_at timestamp(6) without time zone,
    CONSTRAINT data_api_keys_pkey PRIMARY KEY (id),
    CONSTRAINT data_api_keys_key_hash_key UNIQUE (key_hash),
    CONSTRAINT data_api_keys_plan_check CHECK (plan IN ('BASIC', 'PRO', 'ENTERPRISE')),
    CONSTRAINT data_api_keys_monthly_quota_check CHECK (monthly_quota > 0)
);

CREATE TABLE public.data_access_logs (
    id uuid NOT NULL,
    api_key_id uuid NOT NULL,
    endpoint character varying(255) NOT NULL,
    city_slug character varying(100) NOT NULL,
    status_code integer NOT NULL,
    requested_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT data_access_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY public.data_api_keys
    ADD CONSTRAINT fk_data_api_keys_license FOREIGN KEY (data_license_id) REFERENCES public.data_licenses(id);

ALTER TABLE ONLY public.data_api_keys
    ADD CONSTRAINT fk_data_api_keys_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id);

ALTER TABLE ONLY public.data_access_logs
    ADD CONSTRAINT fk_data_access_logs_api_key FOREIGN KEY (api_key_id) REFERENCES public.data_api_keys(id) ON DELETE CASCADE;

CREATE INDEX idx_data_api_keys_license_id ON public.data_api_keys USING btree (data_license_id);
CREATE INDEX idx_data_api_keys_operator_id ON public.data_api_keys USING btree (operator_id);
CREATE INDEX idx_data_access_logs_api_key_id ON public.data_access_logs USING btree (api_key_id);
