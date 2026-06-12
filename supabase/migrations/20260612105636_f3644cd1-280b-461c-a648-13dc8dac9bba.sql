
-- 1. Remove insecure self-join on org_members
DROP POLICY IF EXISTS "join self" ON public.org_members;

-- Allow proposal managers to add members to their own org
CREATE POLICY "managers add members"
  ON public.org_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), org_id, 'proposal_manager'));

-- 2. DELETE policy on org_members
CREATE POLICY "managers remove members"
  ON public.org_members
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), org_id, 'proposal_manager')
    OR user_id = auth.uid()
  );

-- 3. Explicit INSERT policy on user_roles — only proposal managers in same org
CREATE POLICY "managers assign roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), org_id, 'proposal_manager'));

CREATE POLICY "managers revoke roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), org_id, 'proposal_manager'));
