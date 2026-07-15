-- Per-user notification preferences for the new notification center.
-- Global per user (not per-organization) since tasks.organization_id is not
-- reliably populated on create today. Missing rows mean "use the hardcoded
-- default" applied in the dispatch-notification edge function.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    in_app boolean NOT NULL DEFAULT true,
    email boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (auth_user_id, event_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own notification preferences" ON public.notification_preferences
    FOR ALL
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);
