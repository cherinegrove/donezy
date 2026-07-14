-- task_status_definitions / project_status_definitions were scoped to a single
-- auth_user_id with no organization concept at all — each user had their own
-- private set of Kanban stages. In practice only one user ever had rows;
-- everyone else fell back to the frontend's hardcoded generic defaults (or, for
-- project statuses, an empty list), which is why different users saw different
-- stages on what's supposed to be one shared team board.
--
-- This makes both tables organization-shared: everyone in an org sees the same
-- stages, and only org owners/admins (or platform/support admins) can create,
-- edit, reorder, or delete them.

ALTER TABLE public.task_status_definitions ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.project_status_definitions ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'cybersolve';

  UPDATE public.task_status_definitions SET organization_id = v_org_id WHERE organization_id IS NULL;
  UPDATE public.project_status_definitions SET organization_id = v_org_id WHERE organization_id IS NULL;
END $$;

DROP POLICY IF EXISTS "Users can view their own task status definitions" ON public.task_status_definitions;
DROP POLICY IF EXISTS "Users can create their own task status definitions" ON public.task_status_definitions;
DROP POLICY IF EXISTS "Users can update their own task status definitions" ON public.task_status_definitions;
DROP POLICY IF EXISTS "Users can delete their own task status definitions" ON public.task_status_definitions;

CREATE POLICY "Org members can view task status definitions" ON public.task_status_definitions
FOR SELECT TO authenticated
USING (
  auth.uid() = auth_user_id
  OR has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = task_status_definitions.organization_id
    )
  )
);

CREATE POLICY "Org admins can manage task status definitions" ON public.task_status_definitions
FOR ALL TO authenticated
USING (
  has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = task_status_definitions.organization_id
        AND uo.role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = task_status_definitions.organization_id
        AND uo.role IN ('owner', 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Users can view their own project status definitions" ON public.project_status_definitions;
DROP POLICY IF EXISTS "Users can create their own project status definitions" ON public.project_status_definitions;
DROP POLICY IF EXISTS "Users can update their own project status definitions" ON public.project_status_definitions;
DROP POLICY IF EXISTS "Users can delete their own project status definitions" ON public.project_status_definitions;

CREATE POLICY "Org members can view project status definitions" ON public.project_status_definitions
FOR SELECT TO authenticated
USING (
  auth.uid() = auth_user_id
  OR has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = project_status_definitions.organization_id
    )
  )
);

CREATE POLICY "Org admins can manage project status definitions" ON public.project_status_definitions
FOR ALL TO authenticated
USING (
  has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = project_status_definitions.organization_id
        AND uo.role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = project_status_definitions.organization_id
        AND uo.role IN ('owner', 'admin')
    )
  )
);
