ALTER TABLE public.she_people ADD COLUMN IF NOT EXISTS contact_card jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.she_people ADD CONSTRAINT she_contact_card_object CHECK (jsonb_typeof(contact_card)='object' AND octet_length(contact_card::text)<=8000);
COMMENT ON COLUMN public.she_people.contact_card IS 'Owner-submitted public business contact card; published only after profile review. No credentials or private member data.';
