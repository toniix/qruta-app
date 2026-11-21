UPDATE public.qr_codes
SET status = 'PAUSED'
WHERE status = 'REVOKED';

ALTER TABLE public.qr_codes
    DROP CONSTRAINT IF EXISTS qr_codes_status_check;

ALTER TABLE public.qr_codes
    ADD CONSTRAINT qr_codes_status_check
        CHECK (status IN ('ACTIVE', 'PAUSED'));
