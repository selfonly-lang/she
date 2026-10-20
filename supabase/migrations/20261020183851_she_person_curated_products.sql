-- Add curated product references only. Existing profile RLS remains unchanged.
ALTER TABLE public.she_people ADD COLUMN IF NOT EXISTS selected_product_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.she_people ADD CONSTRAINT she_people_selection_limit CHECK (cardinality(selected_product_ids) <= 100);
COMMENT ON COLUMN public.she_people.selected_product_ids IS 'Ordered AD catalog references selected by the page owner; no price, inventory, order or commission authority.';
