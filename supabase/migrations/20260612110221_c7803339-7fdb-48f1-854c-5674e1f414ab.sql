
DROP POLICY IF EXISTS "org insert versions" ON public.section_versions;

CREATE POLICY "editors insert versions"
  ON public.section_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.proposal_sections s
      JOIN public.rfp_projects r ON r.id = s.rfp_id
      WHERE s.id = section_versions.section_id
        AND (
          public.has_role(auth.uid(), r.org_id, 'proposal_manager')
          OR public.has_role(auth.uid(), r.org_id, 'compliance_auditor')
          OR (public.has_role(auth.uid(), r.org_id, 'sme') AND s.assigned_to = auth.uid())
        )
    )
  );
