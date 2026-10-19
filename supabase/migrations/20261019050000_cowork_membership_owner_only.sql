-- Prevent users from joining another user's Cowork session by inserting their own membership.
-- Existing policy allowed user_id = auth.uid() in WITH CHECK for ALL commands,
-- which meant any authenticated user who knew a session UUID could self-add.
DROP POLICY IF EXISTS cowork_members_access ON public.cowork_members;

CREATE POLICY cowork_members_select_access
  ON public.cowork_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.cowork_sessions cs
      WHERE cs.id = cowork_members.session_id AND cs.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY cowork_members_insert_owner
  ON public.cowork_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cowork_sessions cs
      WHERE cs.id = cowork_members.session_id AND cs.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY cowork_members_update_owner
  ON public.cowork_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cowork_sessions cs
      WHERE cs.id = cowork_members.session_id AND cs.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cowork_sessions cs
      WHERE cs.id = cowork_members.session_id AND cs.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY cowork_members_delete_owner
  ON public.cowork_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cowork_sessions cs
      WHERE cs.id = cowork_members.session_id AND cs.owner_id = (SELECT auth.uid())
    )
  );
