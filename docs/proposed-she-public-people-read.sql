-- PROPOSAL ONLY — NOT APPLIED. Requires explicit user approval.
-- Restrict existing owner/moderator policy to authenticated users.
ALTER POLICY she_person_read ON public.she_people TO authenticated;
-- Anonymous visitors see only published profiles. No moderator-function grant.
CREATE POLICY she_person_public_read ON public.she_people FOR SELECT TO anon USING (status = 'published');
