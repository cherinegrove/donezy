-- Allow managers and admins to view messages for other users they manage
-- This enables the dashboard to show notifications for selected team members

CREATE POLICY "Managers and admins can view messages for team members" 
ON messages FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- Allow if user is admin or manager and viewing messages of team members
    EXISTS (
      SELECT 1 FROM public.users u1
      WHERE u1.auth_user_id = auth.uid()
      AND u1.role IN ('admin', 'manager')
    ) AND (
      -- Allow viewing messages sent to team members
      EXISTS (
        SELECT 1 FROM public.users u2
        WHERE u2.id::text = to_user_id
        AND (
          -- Admins can see all messages
          EXISTS (
            SELECT 1 FROM public.users admin
            WHERE admin.auth_user_id = auth.uid()
            AND admin.role = 'admin'
          )
          OR
          -- Managers can see messages for users in their teams
          EXISTS (
            SELECT 1 FROM public.users manager
            WHERE manager.auth_user_id = auth.uid()
            AND manager.role = 'manager'
            AND manager.team_ids && u2.team_ids
          )
        )
      )
    )
  )
);