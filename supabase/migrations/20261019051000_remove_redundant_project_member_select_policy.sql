-- Remove redundant SELECT policy: project_members_access already grants SELECT
-- only to the member themselves or the project owner.
DROP POLICY IF EXISTS project_members_select_member ON public.project_members;
