-- Smart QR Codes and Enhanced Analytics.
--
-- Adds the qr_codes table for smart physical QR codes with cryptographic tokens,
-- allowlisted targets (HOME, ROUTE, STOP, CAMPAIGN), multi-tenant ownership,
-- and lifecycle states (ACTIVE, PAUSED, REVOKED).
--
-- Extends route_events with qr_code_id and expands the category CHECK constraint.

CREATE TABLE public.qr_codes (
    id uuid NOT NULL,
    code character varying(32) NOT NULL,
    label character varying(120) NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id uuid,
    campaign_source character varying(60),
    campaign_medium character varying(60),
    campaign_name character varying(100),
    status character varying(20) NOT NULL DEFAULT 'ACTIVE',
    operator_id uuid,
    created_at timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT qr_codes_pkey PRIMARY KEY (id),
    CONSTRAINT qr_codes_code_key UNIQUE (code),
    CONSTRAINT qr_codes_target_type_check CHECK (target_type IN ('HOME', 'ROUTE', 'STOP', 'CAMPAIGN')),
    CONSTRAINT qr_codes_status_check CHECK (status IN ('ACTIVE', 'PAUSED', 'REVOKED')),
    CONSTRAINT fk_qr_codes_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE SET NULL
);

CREATE INDEX idx_qr_codes_code ON public.qr_codes USING btree (code);
CREATE INDEX idx_qr_codes_status ON public.qr_codes USING btree (status);
CREATE INDEX idx_qr_codes_operator_id ON public.qr_codes USING btree (operator_id);

ALTER TABLE public.route_events
    ADD COLUMN IF NOT EXISTS qr_code_id uuid;

ALTER TABLE public.route_events
    DROP CONSTRAINT IF EXISTS route_events_category_check;

ALTER TABLE public.route_events
    ADD CONSTRAINT route_events_category_check CHECK (((category)::text = ANY ((ARRAY[
        'route_view'::character varying,
        'route_search'::character varying,
        'stop_view'::character varying,
        'nearby_query'::character varying,
        'qr_scan'::character varying,
        'community_post'::character varying,
        'page_view'::character varying,
        'favorite_added'::character varying,
        'qr_redirect_failed'::character varying
    ])::text[])));

CREATE INDEX IF NOT EXISTS idx_route_events_qr_code_id
    ON public.route_events USING btree (qr_code_id, recorded_at);
