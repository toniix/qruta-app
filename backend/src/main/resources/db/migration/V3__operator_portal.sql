-- Operator portal: multi-tenancy foundation.
--
-- Each operator owns transport lines; routes inherit ownership through their line.
-- Operator users authenticate separately from platform administrators and can only
-- reach resources whose operator_id matches their own.

CREATE TABLE public.operators (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    ruc character varying(20) NOT NULL,
    contact_name character varying(255),
    contact_email character varying(255),
    contact_phone character varying(50),
    city_id uuid NOT NULL,
    plan character varying(20) NOT NULL DEFAULT 'PRO',
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT operators_pkey PRIMARY KEY (id),
    CONSTRAINT operators_ruc_key UNIQUE (ruc),
    CONSTRAINT operators_plan_check CHECK (plan IN ('BASIC', 'PRO', 'ENTERPRISE'))
);

CREATE TABLE public.operator_users (
    id uuid NOT NULL,
    operator_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(20) NOT NULL DEFAULT 'EDITOR',
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT operator_users_pkey PRIMARY KEY (id),
    CONSTRAINT operator_users_email_key UNIQUE (email),
    CONSTRAINT operator_users_role_check CHECK (role IN ('OWNER', 'EDITOR'))
);

ALTER TABLE public.transport_lines
    ADD COLUMN operator_id uuid;

CREATE TABLE public.disruptions (
    id uuid NOT NULL,
    operator_id uuid NOT NULL,
    route_id uuid NOT NULL,
    type character varying(40) NOT NULL,
    description character varying(500) NOT NULL,
    starts_at timestamp(6) without time zone NOT NULL,
    ends_at timestamp(6) without time zone,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT disruptions_pkey PRIMARY KEY (id),
    CONSTRAINT disruptions_type_check CHECK (type IN ('DESVIO', 'CORTE', 'HORARIO', 'PARADERO', 'OTRO'))
);

CREATE TABLE public.change_logs (
    id uuid NOT NULL,
    operator_id uuid,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    field character varying(100) NOT NULL,
    old_value text,
    new_value text,
    author_email character varying(255) NOT NULL,
    author_role character varying(30) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT change_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY public.operators
    ADD CONSTRAINT fk_operators_city FOREIGN KEY (city_id) REFERENCES public.cities(id);

ALTER TABLE ONLY public.operator_users
    ADD CONSTRAINT fk_operator_users_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.transport_lines
    ADD CONSTRAINT fk_transport_lines_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id);

ALTER TABLE ONLY public.disruptions
    ADD CONSTRAINT fk_disruptions_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.disruptions
    ADD CONSTRAINT fk_disruptions_route FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;

CREATE INDEX idx_operator_users_operator_id ON public.operator_users USING btree (operator_id);

CREATE INDEX idx_transport_lines_operator_id ON public.transport_lines USING btree (operator_id);

CREATE INDEX idx_disruptions_operator_id ON public.disruptions USING btree (operator_id);

CREATE INDEX idx_disruptions_route_id ON public.disruptions USING btree (route_id);

CREATE INDEX idx_change_logs_operator_id ON public.change_logs USING btree (operator_id);

CREATE INDEX idx_change_logs_entity ON public.change_logs USING btree (entity_type, entity_id);
