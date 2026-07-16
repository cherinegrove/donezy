-- native_field_configs (required/hidden flags for built-in task/project form
-- fields) was scoped to a single auth_user_id: the admin's saved config was
-- only ever readable by the admin themselves, so every other user's forms fell
-- back to defaults — the admin panel and reality disagreed for everyone else.
-- Same fix as task/project status definitions (20260712120000): org-shared
-- reads, org-admin writes.

ALTER TABLE public.native_field_configs ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'cybersolve';

  UPDATE public.native_field_configs SET organization_id = v_org_id WHERE organization_id IS NULL;
END $$;

DROP POLICY IF EXISTS "Users can view their own native field configs" ON public.native_field_configs;
DROP POLICY IF EXISTS "Users can create their own native field configs" ON public.native_field_configs;
DROP POLICY IF EXISTS "Users can update their own native field configs" ON public.native_field_configs;
DROP POLICY IF EXISTS "Users can delete their own native field configs" ON public.native_field_configs;

CREATE POLICY "Org members can view native field configs" ON public.native_field_configs
FOR SELECT TO authenticated
USING (
  auth.uid() = auth_user_id
  OR has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = native_field_configs.organization_id
    )
  )
);

CREATE POLICY "Org admins can manage native field configs" ON public.native_field_configs
FOR ALL TO authenticated
USING (
  has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = native_field_configs.organization_id
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
      WHERE uo.user_id = auth.uid() AND uo.organization_id = native_field_configs.organization_id
        AND uo.role IN ('owner', 'admin')
    )
  )
);
