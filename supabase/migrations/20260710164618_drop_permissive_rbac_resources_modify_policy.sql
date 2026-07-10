-- Security fix (follow-up): same privilege-escalation hole as the other four rbac
-- tables — FOR ALL USING(true) WITH CHECK(true) let any authenticated user modify
-- the RBAC resource catalog. platform_admin-gated policies remain in force.
DROP POLICY IF EXISTS "rbac_resources_modify" ON public.rbac_resources;
