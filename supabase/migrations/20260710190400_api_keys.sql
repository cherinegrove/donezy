-- Phase A2: real, organization-scoped API keys, replacing the current scheme
-- where the public api-create-task/client/project edge functions treat a raw
-- users.id as a permanent, non-rotatable bearer credential with no organization
-- scoping and no revocation. Confirmed nothing currently depends on the old
-- scheme, so it is retired outright rather than run alongside the new one.
--
-- Secrets are never stored — only a SHA-256 hash. The plaintext is returned once,
-- at creation time, by generate_api_key().

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select" ON public.api_keys
FOR SELECT TO authenticated
USING (
  has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid() AND uo.organization_id = api_keys.organization_id
      AND uo.role IN ('owner', 'admin')
  )
);

CREATE POLICY "api_keys_update" ON public.api_keys
FOR UPDATE TO authenticated
USING (
  has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid() AND uo.organization_id = api_keys.organization_id
      AND uo.role IN ('owner', 'admin')
  )
);

-- Generates a new key for an organization. Caller must be an org owner/admin or
-- platform admin. Returns the plaintext key exactly once — it is never stored.
CREATE OR REPLACE FUNCTION public.generate_api_key(p_organization_id uuid, p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_hash text;
BEGIN
  IF NOT (
    has_system_role(auth.uid(), 'platform_admin'::system_role_type)
    OR EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = p_organization_id
        AND uo.role IN ('owner', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'not authorized to create an API key for this organization';
  END IF;

  v_secret := 'dnz_' || encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_secret, 'sha256'), 'hex');

  INSERT INTO public.api_keys (organization_id, user_id, name, key_hash)
  VALUES (p_organization_id, auth.uid(), p_name, v_hash);

  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_api_key(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_api_key(uuid, text) TO authenticated;
