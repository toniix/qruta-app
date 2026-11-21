ALTER TABLE public.community_posts
    ADD COLUMN is_official boolean NOT NULL DEFAULT false,
    ADD COLUMN operator_id uuid;

ALTER TABLE public.community_posts
    ADD CONSTRAINT fk_community_posts_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE SET NULL;

CREATE INDEX idx_community_posts_operator_id ON public.community_posts USING btree (operator_id);

ALTER TABLE public.disruptions
    ADD COLUMN community_post_id uuid;

ALTER TABLE public.disruptions
    ADD CONSTRAINT fk_disruptions_community_post FOREIGN KEY (community_post_id) REFERENCES public.community_posts(id) ON DELETE SET NULL;
