-- APPROVED AND APPLIED 2026-10-21. Historical proposal; do not execute again.
-- Canonical migration: 20261020194447_she_published_person_public_read.sql
-- Restrict existing owner/moderator policy to authenticated users.
ALTER POLICY she_person_read ON public.she_people TO authenticated;
-- Anonymous visitors see only published profiles. No moderator-function grant.
CREATE POLICY she_person_public_read ON public.she_people FOR SELECT TO anon USING (status = 'published');
