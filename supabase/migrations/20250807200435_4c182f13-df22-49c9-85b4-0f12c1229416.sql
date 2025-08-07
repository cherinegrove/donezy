-- Allow managers and admins to view messages for other users they manage
-- This enables the dashboard to show notifications for selected team members

CREATE POLICY "Managers and admins can view messages for team members" 
ON messages FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- Allow if user is admin or manager and viewing messages of team members
    EXISTS (
      SELECT 1 FROM public.users u1
      WHERE u1.id = auth.uid()::text 
      AND u1.role IN ('admin', 'manager')
    ) AND (
      -- Allow viewing messages sent to team members
      EXISTS (
        SELECT 1 FROM public.users u2
        WHERE u2.id = to_user_id
        AND (
          -- Admins can see all messages
          EXISTS (
            SELECT 1 FROM public.users admin
            WHERE admin.id = auth.uid()::text 
            AND admin.role = 'admin'
          )
          OR
          -- Managers can see messages for users in their teams
          EXISTS (
            SELECT 1 FROM public.users manager
            JOIN unnest(manager.team_ids) AS manager_team ON true
            JOIN public.users team_member ON team_member.id = u2.id
            WHERE manager.id = auth.uid()::text 
            AND manager.role = 'manager'
            AND team_member.team_ids && ARRAY[manager_team]
          )
        )
      )
    )
  )
);