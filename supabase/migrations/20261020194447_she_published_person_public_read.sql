-- Approved by user and applied 2026-10-21 (Asia/Taipei).
ALTER POLICY she_person_read ON public.she_people TO authenticated;
CREATE POLICY she_person_public_read ON public.she_people FOR SELECT TO anon USING (status = 'published');
