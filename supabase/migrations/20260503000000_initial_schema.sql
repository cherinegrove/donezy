

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE TYPE "public"."system_role_type" AS ENUM (
    'support_admin',
    'platform_admin'
);


ALTER TYPE "public"."system_role_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_log_time_entry_started"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only log for new entries without end_time (active timers)
  IF NEW.end_time IS NULL THEN
    INSERT INTO time_entry_events (
      time_entry_id,
      auth_user_id,
      event_type,
      event_timestamp,
      details
    ) VALUES (
      NEW.id,
      NEW.auth_user_id,
      'started',
      NEW.start_time,
      jsonb_build_object(
        'task_id', NEW.task_id,
        'project_id', NEW.project_id,
        'client_id', NEW.client_id,
        'trigger', 'auto'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_log_time_entry_started"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_log_time_entry_stopped"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log when end_time goes from NULL to a value (timer stopped)
  IF OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
    INSERT INTO time_entry_events (
      time_entry_id,
      auth_user_id,
      event_type,
      event_timestamp,
      details
    ) VALUES (
      NEW.id,
      NEW.auth_user_id,
      'stopped',
      NEW.end_time,
      jsonb_build_object(
        'duration', NEW.duration,
        'notes', NEW.notes,
        'trigger', 'auto'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_log_time_entry_stopped"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_assign_system_roles"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT public.has_system_role(_user_id, 'platform_admin')
$$;


ALTER FUNCTION "public"."can_assign_system_roles"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_perform_action"("action_type" "text", "user_uuid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_plan RECORD;
  current_usage INTEGER;
  plan_limit INTEGER;
  current_period_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's current plan and billing period
  SELECT sp.features, s.billing_period_start, s.seats
  INTO user_plan
  FROM public.account_subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_uuid AND s.status = 'active';
  
  IF user_plan IS NULL THEN
    RETURN FALSE;
  END IF;
  
  current_period_start := user_plan.billing_period_start;
  
  -- Check based on action type
  CASE action_type
    WHEN 'create_video' THEN
      -- Check video limit
      IF user_plan.features->>'video_limit' = 'unlimited' THEN
        RETURN TRUE;
      END IF;
      
      plan_limit := (user_plan.features->>'video_limit')::INTEGER;
      
      SELECT COUNT(*)
      INTO current_usage
      FROM public.shared_videos sv
      WHERE sv.user_id = user_uuid 
        AND sv.created_at >= current_period_start;
      
      RETURN current_usage < plan_limit;
      
    WHEN 'ai_transcription' THEN
      -- Check AI transcription limit
      plan_limit := (user_plan.features->>'ai_transcription_limit')::INTEGER;
      
      SELECT COUNT(*)
      INTO current_usage
      FROM public.usage_tracking ut
      WHERE ut.user_id = user_uuid 
        AND ut.resource_type = 'transcription'
        AND ut.created_at >= current_period_start;
      
      RETURN current_usage < plan_limit;
      
    ELSE
      RETURN TRUE;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."can_user_perform_action"("action_type" "text", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_videos"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Delete expired video records and their storage files
  DELETE FROM public.shared_videos WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_videos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_user_data"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Clean up video folders (should be handled by CASCADE now)
  -- But let's be explicit for safety
  DELETE FROM video_folders WHERE user_id = OLD.id;
  
  -- Clean up shared videos
  DELETE FROM shared_videos WHERE user_id = OLD.id;
  
  -- Update the public.users table to mark as deleted instead of removing
  UPDATE public.users 
  SET status = 'deleted', updated_at = NOW()
  WHERE auth_user_id = OLD.id;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."cleanup_user_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_project_channel"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Create a default channel for the new project
  INSERT INTO public.channels (
    project_id,
    name,
    description,
    is_private,
    created_by
  ) VALUES (
    NEW.id,
    NEW.name || ' Chat',
    'Default chat channel for ' || NEW.name,
    false,
    NEW.auth_user_id
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_project_channel"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_account_limits"("account_user_id" "uuid") RETURNS TABLE("max_users" integer, "max_guests" integer, "current_users" bigint, "current_guests" bigint, "can_add_user" boolean, "can_add_guest" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.max_users, 1) as max_users,
    COALESCE(s.max_guests + s.additional_guests, 1) as max_guests,
    (SELECT COUNT(*) FROM public.users WHERE auth_user_id = account_user_id AND (is_guest = false OR is_guest IS NULL)) as current_users,
    (SELECT COUNT(*) FROM public.users WHERE guest_of_user_id = account_user_id AND is_guest = true) as current_guests,
    (SELECT COUNT(*) FROM public.users WHERE auth_user_id = account_user_id AND (is_guest = false OR is_guest IS NULL)) < COALESCE(s.max_users, 1) as can_add_user,
    (SELECT COUNT(*) FROM public.users WHERE guest_of_user_id = account_user_id AND is_guest = true) < COALESCE(s.max_guests + s.additional_guests, 1) as can_add_guest
  FROM public.account_subscriptions s
  WHERE s.user_id = account_user_id
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_account_limits"("account_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_organization"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT organization_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_current_user_organization"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_portal_data"("portal_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_portal_id uuid;
  v_project_id uuid;
  v_result jsonb;
BEGIN
  SELECT id, project_id INTO v_portal_id, v_project_id
  FROM public.client_portals
  WHERE token = portal_token AND is_active = true;

  IF v_portal_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Portal not found or inactive');
  END IF;

  SELECT jsonb_build_object(
    'project', (
      SELECT jsonb_build_object(
        'id', p.id,
        'name', COALESCE(p.name, 'Untitled'),
        'description', COALESCE(p.description, ''),
        'status', COALESCE(p.status, 'active'),
        'start_date', p.start_date,
        'due_date', p.end_date,
        'service_type', 'project',
        'allocated_hours', p.budget,
        'used_hours', (
          SELECT COALESCE(SUM(te.duration) / 60.0, 0)
          FROM time_entries te
          JOIN tasks t ON te.task_id = t.id
          WHERE t.project_id = p.id AND te.end_time IS NOT NULL
        )
      )
      FROM projects p WHERE p.id = v_project_id
    ),
    'tasks', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'status', COALESCE(t.status, 'todo'),
        'priority', COALESCE(t.priority, 'medium'),
        'due_date', t.due_date,
        'estimated_hours', t.estimated_hours,
        'created_at', t.created_at,
        'time_spent_hours', COALESCE((
          SELECT SUM(te.duration) / 60.0
          FROM time_entries te
          WHERE te.task_id = t.id AND te.end_time IS NOT NULL
        ), 0)
      ) ORDER BY t.created_at DESC), '[]'::jsonb)
      FROM tasks t WHERE t.project_id = v_project_id
    ),
    'total_hours', (
      SELECT COALESCE(SUM(te.duration) / 60.0, 0)
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      WHERE t.project_id = v_project_id AND te.end_time IS NOT NULL
    ),
    'approved_hours', 0,
    'declined_hours', 0,
    'pending_hours', (
      SELECT COALESCE(SUM(te.duration) / 60.0, 0)
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      WHERE t.project_id = v_project_id AND te.end_time IS NOT NULL
    ),
    'comments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', pc.id,
        'client_name', pc.client_name,
        'content', pc.content,
        'created_at', pc.created_at
      ) ORDER BY pc.created_at DESC), '[]'::jsonb)
      FROM portal_comments pc
      WHERE pc.portal_id = v_portal_id
    ),
    'team_members', (
      SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
        'auth_user_id', u.auth_user_id,
        'name', COALESCE(u.full_name, u.email),
        'email', COALESCE(u.email, '')
      )), '[]'::jsonb)
      FROM profiles u
      WHERE u.auth_user_id IN (
        SELECT p.owner_id FROM projects p WHERE p.id = v_project_id
        UNION
        SELECT t.assignee_id FROM tasks t WHERE t.project_id = v_project_id AND t.assignee_id IS NOT NULL
      )
    ),
    'portal_id', v_portal_id,
    'project_id', v_project_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_portal_data"("portal_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_workspace_id"("_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT DISTINCT auth_user_id 
  FROM time_entries 
  WHERE user_id = (_user_id)::text
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_workspace_id"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare
  v_platform_admin_id uuid;
  v_assigned_by uuid;
BEGIN
    -- Insert new user into public.users
    INSERT INTO public.users (
        auth_user_id,
        name,
        email,
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,  -- Supabase Auth user ID
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),  -- Use role from metadata, default to 'user'
        NOW(),
        NOW()
    )
    ON CONFLICT (auth_user_id) DO UPDATE
    SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        updated_at = NOW();

    SELECT sr.id
    INTO v_platform_admin_id
    FROM public.system_roles sr
    WHERE sr.name = 'platform_admin'
    limit 1;

    IF v_platform_admin_id IS NULL THEN
        return NEW;
    END IF;

    SELECT u.auth_user_id
    INTO v_assigned_by
    FROM public.users u
    WHERE u.role = 'admin'
    ORDER BY u.created_at, u.auth_user_id
    limit 1;

    IF v_assigned_by IS NULL THEN
        return NEW;
    END IF;

    INSERT INTO public.user_system_roles (
        user_id,
        system_role_id,
        assigned_by,
        assigned_at
    )
    VALUES (
        NEW.id,
        v_platform_admin_id,
        v_assigned_by,
        NOW()
    );

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Log the error but do not block signup
    RAISE NOTICE 'Error in handle_new_user for email=% auth_user_id=%: %', NEW.email, NEW.id, SQLERRM;
    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Create a free subscription for new users
  INSERT INTO public.account_subscriptions (
    user_id, 
    plan_type, 
    max_users, 
    max_guests,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    'free', 
    5,  -- Allow 5 users on free plan
    2,  -- Allow 2 guests on free plan
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_system_role"("_user_id" "uuid", "_role" "public"."system_role_type") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_system_roles usr
    JOIN public.system_roles sr ON usr.system_role_id = sr.id
    WHERE usr.user_id = _user_id 
    AND sr.name = _role
  )
$$;


ALTER FUNCTION "public"."has_system_role"("_user_id" "uuid", "_role" "public"."system_role_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_channel_member"("cid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select exists (
    select 1 from channel_members
    where user_id = auth.uid()
    and channel_id = cid
  );
$$;


ALTER FUNCTION "public"."is_channel_member"("cid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_support_action"("_action" "text", "_target_user_id" "uuid" DEFAULT NULL::"uuid", "_details" "jsonb" DEFAULT '{}'::"jsonb", "_ip_address" "inet" DEFAULT NULL::"inet") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.support_audit_log (
    support_user_id,
    target_user_id,
    action,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    _target_user_id,
    _action,
    _details,
    _ip_address
  );
END;
$$;


ALTER FUNCTION "public"."log_support_action"("_action" "text", "_target_user_id" "uuid", "_details" "jsonb", "_ip_address" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rbac_user_has_permission"("_user_id" "uuid", "_resource" "text", "_action" "text", "_required_scope" "text" DEFAULT 'own'::"text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rbac_user_roles ur
    JOIN rbac_role_permissions rp ON rp.role_id = ur.role_id
    JOIN rbac_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.resource = _resource
      AND p.action = _action
      AND (
        -- Scope hierarchy: 'all' covers everything, 'project' covers project+own, 'own' covers own
        rp.scope = 'all'
        OR (rp.scope = 'project' AND _required_scope IN ('project', 'own'))
        OR (rp.scope = _required_scope)
      )
  );
$$;


ALTER FUNCTION "public"."rbac_user_has_permission"("_user_id" "uuid", "_resource" "text", "_action" "text", "_required_scope" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_timer_status_with_end_time"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- When end_time changes from NULL to a value, mark as completed
  IF OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
    NEW.timer_status = 'completed';
  END IF;
  
  -- When end_time changes from a value to NULL (rare, but handle it), mark as active
  IF OLD.end_time IS NOT NULL AND NEW.end_time IS NULL THEN
    NEW.timer_status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_timer_status_with_end_time"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_usage"("resource_type_param" "text", "resource_id_param" "uuid" DEFAULT NULL::"uuid", "amount_param" numeric DEFAULT 1, "user_uuid" "uuid" DEFAULT "auth"."uid"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  billing_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current billing period start
  SELECT billing_period_start
  INTO billing_start
  FROM public.account_subscriptions
  WHERE user_id = user_uuid AND status = 'active';
  
  -- Insert usage record
  INSERT INTO public.usage_tracking (
    user_id, 
    resource_type, 
    resource_id, 
    amount, 
    billing_period_start
  ) VALUES (
    user_uuid, 
    resource_type_param, 
    resource_id_param, 
    amount_param, 
    billing_start
  );
END;
$$;


ALTER FUNCTION "public"."track_usage"("resource_type_param" "text", "resource_id_param" "uuid", "amount_param" numeric, "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_check_ins_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_check_ins_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_client_portals_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_client_portals_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_email_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_email_templates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_native_field_configs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_native_field_configs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organizations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_organizations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_project_notes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_rbac_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_rbac_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tenant_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tenant_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_belongs_to_organization"("org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id
  );
$$;


ALTER FUNCTION "public"."user_belongs_to_organization"("org_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_type" "text" DEFAULT 'free'::"text" NOT NULL,
    "max_users" integer DEFAULT 1 NOT NULL,
    "max_guests" integer DEFAULT 1 NOT NULL,
    "additional_guests" integer DEFAULT 0 NOT NULL,
    "monthly_cost" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "stripe_subscription_id" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan_id" "uuid",
    "seats" integer DEFAULT 1,
    "billing_period_start" timestamp with time zone DEFAULT "now"(),
    "billing_period_end" timestamp with time zone DEFAULT ("now"() + '1 mon'::interval)
);


ALTER TABLE "public"."account_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channel_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."channel_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_private" boolean DEFAULT false NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "yesterday" "text",
    "today" "text" NOT NULL,
    "blockers" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."check_ins" REPLICA IDENTITY FULL;


ALTER TABLE "public"."check_ins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_portals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "created_by" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_portals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "website" "text",
    "address" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" DEFAULT '👍'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comment_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "content" "text" NOT NULL,
    "mentioned_user_ids" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "images" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "required" boolean DEFAULT false NOT NULL,
    "applicable_to" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "options" "text"[],
    "default_value" "jsonb",
    "field_order" integer DEFAULT 0 NOT NULL,
    "reportable" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    CONSTRAINT "custom_fields_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'date'::"text", 'dropdown'::"text", 'multiselect'::"text", 'checkbox'::"text", 'number'::"text"])))
);


ALTER TABLE "public"."custom_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "color" "text" DEFAULT '#10b981'::"text"
);


ALTER TABLE "public"."custom_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_chat_thread_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_key" "text" NOT NULL,
    "task_id" "text" NOT NULL,
    "project_id" "text" NOT NULL,
    "space_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."google_chat_thread_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integration_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "integration_name" "text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."integration_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "used" boolean DEFAULT false,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "mentioned_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mentions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."message_reactions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "from_user_id" "text" NOT NULL,
    "to_user_id" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read" boolean DEFAULT false,
    "priority" "text" DEFAULT 'normal'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "channel_id" "uuid",
    "mentioned_users" "text"[] DEFAULT '{}'::"text"[],
    "parent_message_id" "uuid",
    "task_id" "uuid",
    "project_id" "uuid"
);

ALTER TABLE ONLY "public"."messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."native_field_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "field_name" "text" NOT NULL,
    "required" boolean DEFAULT false NOT NULL,
    "default_value" "jsonb",
    "hidden" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "native_field_configs_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['tasks'::"text", 'projects'::"text"])))
);


ALTER TABLE "public"."native_field_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" "uuid",
    "client_id" "uuid",
    "task_id" "uuid",
    "organization_id" "uuid"
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "domain" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "subscription_plan" "text" DEFAULT 'free'::"text",
    "max_users" integer DEFAULT 5,
    "max_guests" integer DEFAULT 2,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "portal_id" "uuid" NOT NULL,
    "client_name" "text" NOT NULL,
    "client_email" "text",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."portal_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "invited_by" "uuid",
    "email" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "file_path" "text",
    "file_size" integer,
    "mime_type" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "folder_id" "uuid",
    "is_external_link" boolean DEFAULT false,
    "external_url" "text",
    "external_provider" "text",
    CONSTRAINT "check_external_link_url" CHECK (((("is_external_link" = false) AND ("file_path" IS NOT NULL) AND ("file_size" IS NOT NULL)) OR (("is_external_link" = true) AND ("external_url" IS NOT NULL))))
);


ALTER TABLE "public"."project_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_folder_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."project_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "reminder_type" "text" NOT NULL,
    "email_sent_to" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_status_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "is_final" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_status_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_template_subtasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_task_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "estimated_hours" integer DEFAULT 0,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_template_subtasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_template_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "estimated_hours" integer DEFAULT 0,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_template_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "service_type" "text" DEFAULT 'project'::"text" NOT NULL,
    "default_duration" integer DEFAULT 30 NOT NULL,
    "allocated_hours" integer DEFAULT 0 NOT NULL,
    "custom_fields" "text"[] DEFAULT '{}'::"text"[],
    "team_ids" "text"[] DEFAULT '{}'::"text"[],
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "usage_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "service_type" "text" DEFAULT 'project'::"text" NOT NULL,
    "status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "start_date" "text",
    "due_date" "text",
    "allocated_hours" integer DEFAULT 0,
    "used_hours" integer DEFAULT 0,
    "team_ids" "text"[] DEFAULT '{}'::"text"[],
    "watcher_ids" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "owner_id" "uuid",
    "collaborator_ids" "text"[] DEFAULT '{}'::"text"[],
    "organization_id" "uuid",
    "reminder_date" "text",
    "google_chat_settings" "jsonb" DEFAULT '{"enabled": false, "webhook_url": null, "notifications": {"task_created": {"enabled": true, "message_template": "🆕 New task created: {{task_title}} in project {{project_name}}"}, "task_overdue": {"enabled": true, "message_template": "⚠️ Task overdue: {{task_title}} in project {{project_name}} (Due: {{due_date}})"}, "task_updated": {"enabled": false, "message_template": "📝 Task updated: {{task_title}} in project {{project_name}}"}, "task_completed": {"enabled": true, "message_template": "✅ Task completed: {{task_title}} in project {{project_name}}"}}}'::"jsonb",
    "weekly_roundup_settings" "jsonb"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "project_id" "text",
    "item_name" "text" NOT NULL,
    "description" "text",
    "amount" numeric(10,2) NOT NULL,
    "purchase_date" "date" NOT NULL,
    "receipt_url" "text",
    "category" "text",
    "approved" boolean DEFAULT false,
    "approved_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rbac_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "resource" "text" NOT NULL,
    "action" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rbac_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rbac_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rbac_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rbac_role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "scope" "text" DEFAULT 'own'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rbac_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rbac_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#10b981'::"text",
    "is_system" boolean DEFAULT false NOT NULL,
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rbac_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rbac_user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rbac_user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "project_id" "uuid" NOT NULL,
    "assignee_id" "text",
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "collaborator_ids" "text"[] DEFAULT '{}'::"text"[],
    "estimated_hours" integer,
    "recurrence_pattern" "text" NOT NULL,
    "recurrence_interval" integer DEFAULT 1 NOT NULL,
    "days_of_week" integer[],
    "day_of_month" integer,
    "start_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_date" timestamp with time zone,
    "next_generation_date" timestamp with time zone NOT NULL,
    "last_generated_date" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recurring_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_videos" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "duration" integer NOT NULL,
    "file_size" integer NOT NULL,
    "storage_path" "text" NOT NULL,
    "thumbnail_data" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "folder_id" "uuid"
);


ALTER TABLE "public"."shared_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price_monthly" numeric(10,2) NOT NULL,
    "per_seat" boolean DEFAULT false,
    "min_seats" integer DEFAULT 1,
    "features" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "support_user_id" "uuid" NOT NULL,
    "target_user_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "public"."system_role_type" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "file_path" "text",
    "file_size" integer,
    "mime_type" "text",
    "is_external_link" boolean DEFAULT false,
    "external_url" "text",
    "external_provider" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "task_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."task_logs" REPLICA IDENTITY FULL;


ALTER TABLE "public"."task_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "reminder_type" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_sent_to" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "task_reminders_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['due_date'::"text", 'custom_reminder'::"text"])))
);


ALTER TABLE "public"."task_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_status_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "is_final" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "value" "text"
);


ALTER TABLE "public"."task_status_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "default_priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "default_status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "include_custom_fields" "text"[] DEFAULT '{}'::"text"[],
    "field_order" "text"[] DEFAULT '{}'::"text"[],
    "form_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "task_title" "text",
    "task_description" "text",
    "checklist" "jsonb" DEFAULT '[]'::"jsonb",
    "links" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."task_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'backlog'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "assignee_id" "text",
    "due_date" "text",
    "estimated_hours" integer,
    "actual_hours" integer DEFAULT 0,
    "watcher_ids" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "collaborator_ids" "text"[] DEFAULT '{}'::"text"[],
    "organization_id" "uuid",
    "reminder_date" timestamp with time zone,
    "related_task_ids" "text"[] DEFAULT '{}'::"text"[],
    "checklist" "jsonb" DEFAULT '[]'::"jsonb",
    "order_index" integer DEFAULT 0,
    "backlog_reason" "text",
    "awaiting_feedback_details" "text",
    "due_date_change_reason" "text",
    "last_due_date_change" timestamp with time zone,
    "awaiting_feedback_followup_date" "date"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "color" "text" DEFAULT '#3b82f6'::"text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_account_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "admin_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_account_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" NOT NULL,
    "primary_contact_name" "text",
    "primary_contact_email" "text",
    "status" "text" DEFAULT 'trial'::"text" NOT NULL,
    "subscription_tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "subscription_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "billing_cycle" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "trial_end_date" timestamp with time zone,
    "next_billing_date" timestamp with time zone,
    "auto_renew" boolean DEFAULT true NOT NULL,
    "account_limits" "jsonb" DEFAULT '{"tasks": 1000, "users": 5, "storage_gb": 5}'::"jsonb" NOT NULL,
    "feature_flags" "jsonb" DEFAULT '{"api_access": false, "client_portal": true, "custom_branding": false, "video_recording": false, "advanced_reporting": false}'::"jsonb" NOT NULL,
    "internal_notes" "text",
    "last_activity_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_accounts_billing_cycle_check" CHECK (("billing_cycle" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "tenant_accounts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'trial'::"text", 'cancelled'::"text", 'suspended'::"text"]))),
    CONSTRAINT "tenant_accounts_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'starter'::"text", 'pro'::"text", 'enterprise'::"text"])))
);


ALTER TABLE "public"."tenant_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid",
    "action_type" "text" NOT NULL,
    "account_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "stripe_invoice_id" "text",
    "amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invoice_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_date" timestamp with time zone,
    "paid_date" timestamp with time zone,
    "invoice_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_invoices_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'pending'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."tenant_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text", 'viewer'::"text"]))),
    CONSTRAINT "tenant_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."tenant_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test" OWNER TO "postgres";


ALTER TABLE "public"."test" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."test_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "task_id" "text",
    "project_id" "text",
    "client_id" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "duration" integer DEFAULT 0,
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "text",
    "timer_status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "time_entries_timer_status_check" CHECK (("timer_status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entry_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "time_entry_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."time_entry_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."time_entry_events" IS 'Audit log for time entry events. Event types: started, stopped, paused, resumed, manual_edit, duration_changed, notes_changed, project_changed, task_changed, status_changed';



CREATE TABLE IF NOT EXISTS "public"."usage_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "amount" numeric(10,2) DEFAULT 1,
    "billing_period_start" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."usage_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invited_by" "uuid"
);


ALTER TABLE "public"."user_organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_project_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_project_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_system_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "system_role_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_system_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "auth_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "avatar" "text",
    "role" "text" DEFAULT 'developer'::"text" NOT NULL,
    "team_ids" "text"[] DEFAULT '{}'::"text"[],
    "job_title" "text",
    "client_id" "uuid",
    "phone" "text",
    "employment_type" "text",
    "billing_type" "text",
    "hourly_rate" numeric(10,2),
    "monthly_rate" numeric(10,2),
    "billing_rate" numeric(10,2),
    "currency" "text" DEFAULT 'USD'::"text",
    "client_role" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "manager_id" "uuid",
    "notification_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "is_guest" boolean DEFAULT false,
    "guest_of_user_id" "uuid",
    "guest_permissions" "jsonb" DEFAULT '{"canViewTasks": true, "canViewProjects": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users_email_duplicates" (
    "id" "uuid",
    "auth_user_id" "uuid",
    "name" "text",
    "email" "text",
    "avatar" "text",
    "role" "text",
    "team_ids" "text"[],
    "job_title" "text",
    "client_id" "uuid",
    "phone" "text",
    "employment_type" "text",
    "billing_type" "text",
    "hourly_rate" numeric(10,2),
    "monthly_rate" numeric(10,2),
    "billing_rate" numeric(10,2),
    "currency" "text",
    "client_role" "text",
    "permissions" "jsonb",
    "manager_id" "uuid",
    "notification_preferences" "jsonb",
    "is_guest" boolean,
    "guest_of_user_id" "uuid",
    "guest_permissions" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "organization_id" "uuid"
);


ALTER TABLE "public"."users_email_duplicates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."video_folders" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_subscriptions"
    ADD CONSTRAINT "account_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."account_subscriptions"
    ADD CONSTRAINT "account_subscriptions_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_comment_id_user_id_emoji_key" UNIQUE ("comment_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_fields"
    ADD CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_roles"
    ADD CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_type_key" UNIQUE ("type");



ALTER TABLE ONLY "public"."google_chat_thread_mappings"
    ADD CONSTRAINT "google_chat_thread_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_chat_thread_mappings"
    ADD CONSTRAINT "google_chat_thread_mappings_thread_key_unique" UNIQUE ("thread_key");



ALTER TABLE ONLY "public"."integration_settings"
    ADD CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."mentions"
    ADD CONSTRAINT "mentions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_user_id_emoji_key" UNIQUE ("message_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."native_field_configs"
    ADD CONSTRAINT "native_field_configs_auth_user_id_entity_type_field_name_key" UNIQUE ("auth_user_id", "entity_type", "field_name");



ALTER TABLE ONLY "public"."native_field_configs"
    ADD CONSTRAINT "native_field_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."portal_comments"
    ADD CONSTRAINT "portal_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_files"
    ADD CONSTRAINT "project_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_folders"
    ADD CONSTRAINT "project_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_notes"
    ADD CONSTRAINT "project_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_reminders"
    ADD CONSTRAINT "project_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_status_definitions"
    ADD CONSTRAINT "project_status_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_template_subtasks"
    ADD CONSTRAINT "project_template_subtasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_template_tasks"
    ADD CONSTRAINT "project_template_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_templates"
    ADD CONSTRAINT "project_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rbac_permissions"
    ADD CONSTRAINT "rbac_permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."rbac_permissions"
    ADD CONSTRAINT "rbac_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rbac_permissions"
    ADD CONSTRAINT "rbac_permissions_resource_action_key" UNIQUE ("resource", "action");



ALTER TABLE ONLY "public"."rbac_resources"
    ADD CONSTRAINT "rbac_resources_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."rbac_resources"
    ADD CONSTRAINT "rbac_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rbac_role_permissions"
    ADD CONSTRAINT "rbac_role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rbac_role_permissions"
    ADD CONSTRAINT "rbac_role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."rbac_roles"
    ADD CONSTRAINT "rbac_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rbac_user_roles"
    ADD CONSTRAINT "rbac_user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rbac_user_roles"
    ADD CONSTRAINT "rbac_user_roles_user_id_role_id_key" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."recurring_tasks"
    ADD CONSTRAINT "recurring_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_videos"
    ADD CONSTRAINT "shared_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_audit_log"
    ADD CONSTRAINT "support_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_admins"
    ADD CONSTRAINT "system_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_admins"
    ADD CONSTRAINT "system_admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."system_roles"
    ADD CONSTRAINT "system_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."system_roles"
    ADD CONSTRAINT "system_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_files"
    ADD CONSTRAINT "task_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_logs"
    ADD CONSTRAINT "task_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_reminders"
    ADD CONSTRAINT "task_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_status_definitions"
    ADD CONSTRAINT "task_status_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_account_events"
    ADD CONSTRAINT "tenant_account_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_accounts"
    ADD CONSTRAINT "tenant_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_audit_log"
    ADD CONSTRAINT "tenant_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_invoices"
    ADD CONSTRAINT "tenant_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test"
    ADD CONSTRAINT "test_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entry_events"
    ADD CONSTRAINT "time_entry_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_settings"
    ADD CONSTRAINT "unique_user_integration" UNIQUE ("auth_user_id", "integration_name");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."user_project_favorites"
    ADD CONSTRAINT "user_project_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_project_favorites"
    ADD CONSTRAINT "user_project_favorites_user_id_project_id_key" UNIQUE ("user_id", "project_id");



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_user_id_system_role_id_key" UNIQUE ("user_id", "system_role_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("auth_user_id");



ALTER TABLE ONLY "public"."video_folders"
    ADD CONSTRAINT "video_folders_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_comment_reactions_comment_id" ON "public"."comment_reactions" USING "btree" ("comment_id");



CREATE INDEX "idx_comment_reactions_user_id" ON "public"."comment_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_google_chat_thread_mappings_thread_key" ON "public"."google_chat_thread_mappings" USING "btree" ("thread_key");



CREATE INDEX "idx_integration_settings_user_integration" ON "public"."integration_settings" USING "btree" ("auth_user_id", "integration_name");



CREATE INDEX "idx_message_reactions_message_id" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_message_reactions_user_id" ON "public"."message_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_messages_parent_message_id" ON "public"."messages" USING "btree" ("parent_message_id");



CREATE INDEX "idx_notes_client_id" ON "public"."notes" USING "btree" ("client_id");



CREATE INDEX "idx_notes_project_id" ON "public"."notes" USING "btree" ("project_id");



CREATE INDEX "idx_notes_task_id" ON "public"."notes" USING "btree" ("task_id");



CREATE INDEX "idx_project_notes_tags" ON "public"."project_notes" USING "gin" ("tags");



CREATE INDEX "idx_projects_organization_id" ON "public"."projects" USING "btree" ("organization_id");



CREATE INDEX "idx_rbac_permissions_action" ON "public"."rbac_permissions" USING "btree" ("action");



CREATE INDEX "idx_rbac_permissions_resource" ON "public"."rbac_permissions" USING "btree" ("resource");



CREATE INDEX "idx_rbac_role_permissions_permission_id" ON "public"."rbac_role_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_rbac_role_permissions_role_id" ON "public"."rbac_role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_rbac_user_roles_role_id" ON "public"."rbac_user_roles" USING "btree" ("role_id");



CREATE INDEX "idx_rbac_user_roles_user_id" ON "public"."rbac_user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_recurring_tasks_auth_user" ON "public"."recurring_tasks" USING "btree" ("auth_user_id");



CREATE INDEX "idx_recurring_tasks_next_generation" ON "public"."recurring_tasks" USING "btree" ("next_generation_date") WHERE ("is_active" = true);



CREATE INDEX "idx_shared_videos_folder_id" ON "public"."shared_videos" USING "btree" ("folder_id");



CREATE INDEX "idx_task_files_task_id" ON "public"."task_files" USING "btree" ("task_id");



CREATE INDEX "idx_task_reminders_sent_at" ON "public"."task_reminders" USING "btree" ("sent_at");



CREATE INDEX "idx_task_reminders_task_id" ON "public"."task_reminders" USING "btree" ("task_id");



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");



CREATE INDEX "idx_tasks_organization_id" ON "public"."tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_tasks_project_status_order" ON "public"."tasks" USING "btree" ("project_id", "status", "order_index");



CREATE INDEX "idx_tasks_related_task_ids" ON "public"."tasks" USING "gin" ("related_task_ids");



CREATE INDEX "idx_tasks_reminder_date" ON "public"."tasks" USING "btree" ("reminder_date");



CREATE INDEX "idx_tenant_account_events_account" ON "public"."tenant_account_events" USING "btree" ("account_id");



CREATE INDEX "idx_tenant_accounts_status" ON "public"."tenant_accounts" USING "btree" ("status");



CREATE INDEX "idx_tenant_accounts_tier" ON "public"."tenant_accounts" USING "btree" ("subscription_tier");



CREATE INDEX "idx_tenant_audit_log_account" ON "public"."tenant_audit_log" USING "btree" ("account_id");



CREATE INDEX "idx_tenant_audit_log_admin" ON "public"."tenant_audit_log" USING "btree" ("admin_user_id");



CREATE INDEX "idx_tenant_invoices_account" ON "public"."tenant_invoices" USING "btree" ("account_id");



CREATE INDEX "idx_tenant_users_account" ON "public"."tenant_users" USING "btree" ("account_id");



CREATE INDEX "idx_tenant_users_email" ON "public"."tenant_users" USING "btree" ("email");



CREATE INDEX "idx_time_entries_timer_status" ON "public"."time_entries" USING "btree" ("timer_status");



CREATE INDEX "idx_time_entries_user_timer_status" ON "public"."time_entries" USING "btree" ("user_id", "timer_status");



CREATE INDEX "idx_time_entry_events_event_type" ON "public"."time_entry_events" USING "btree" ("event_type");



CREATE INDEX "idx_time_entry_events_time_entry_id" ON "public"."time_entry_events" USING "btree" ("time_entry_id");



CREATE INDEX "idx_time_entry_events_timestamp" ON "public"."time_entry_events" USING "btree" ("event_timestamp" DESC);



CREATE INDEX "idx_user_organizations_org_id" ON "public"."user_organizations" USING "btree" ("organization_id");



CREATE INDEX "idx_user_organizations_user_id" ON "public"."user_organizations" USING "btree" ("user_id");



CREATE INDEX "idx_user_project_favorites_project_id" ON "public"."user_project_favorites" USING "btree" ("project_id");



CREATE INDEX "idx_user_project_favorites_user_id" ON "public"."user_project_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_users_organization_id" ON "public"."users" USING "btree" ("organization_id");



CREATE INDEX "idx_video_folders_user_id" ON "public"."video_folders" USING "btree" ("user_id");



CREATE UNIQUE INDEX "users_auth_user_id_unique_idx" ON "public"."users" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "on_time_entry_insert_log_started" AFTER INSERT ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."auto_log_time_entry_started"();



CREATE OR REPLACE TRIGGER "on_time_entry_update_log_stopped" AFTER UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."auto_log_time_entry_stopped"();



CREATE OR REPLACE TRIGGER "sync_timer_status_trigger" BEFORE UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."sync_timer_status_with_end_time"();



CREATE OR REPLACE TRIGGER "tenant_accounts_updated_at" BEFORE UPDATE ON "public"."tenant_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_tenant_updated_at"();



CREATE OR REPLACE TRIGGER "tenant_users_updated_at" BEFORE UPDATE ON "public"."tenant_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_tenant_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rbac_permissions_updated_at" BEFORE UPDATE ON "public"."rbac_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_rbac_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rbac_resources_updated_at" BEFORE UPDATE ON "public"."rbac_resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_rbac_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rbac_roles_updated_at" BEFORE UPDATE ON "public"."rbac_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_rbac_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_create_default_project_channel" AFTER INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_project_channel"();



CREATE OR REPLACE TRIGGER "update_check_ins_updated_at" BEFORE UPDATE ON "public"."check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."update_check_ins_updated_at"();



CREATE OR REPLACE TRIGGER "update_client_portals_updated_at" BEFORE UPDATE ON "public"."client_portals" FOR EACH ROW EXECUTE FUNCTION "public"."update_client_portals_updated_at"();



CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_notes_updated_at"();



CREATE OR REPLACE TRIGGER "update_email_templates_updated_at" BEFORE UPDATE ON "public"."email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_email_templates_updated_at"();



CREATE OR REPLACE TRIGGER "update_native_field_configs_updated_at" BEFORE UPDATE ON "public"."native_field_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_native_field_configs_updated_at"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_organizations_updated_at"();



CREATE OR REPLACE TRIGGER "update_project_notes_updated_at" BEFORE UPDATE ON "public"."project_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_notes_updated_at"();



ALTER TABLE ONLY "public"."account_subscriptions"
    ADD CONSTRAINT "account_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."account_subscriptions"
    ADD CONSTRAINT "account_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."custom_fields"
    ADD CONSTRAINT "custom_fields_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."custom_roles"
    ADD CONSTRAINT "custom_roles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_roles"
    ADD CONSTRAINT "custom_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."mentions"
    ADD CONSTRAINT "mentions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."portal_comments"
    ADD CONSTRAINT "portal_comments_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "public"."client_portals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_files"
    ADD CONSTRAINT "project_files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."project_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_folders"
    ADD CONSTRAINT "project_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."project_folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_status_definitions"
    ADD CONSTRAINT "project_status_definitions_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_template_subtasks"
    ADD CONSTRAINT "project_template_subtasks_template_task_id_fkey" FOREIGN KEY ("template_task_id") REFERENCES "public"."project_template_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_template_tasks"
    ADD CONSTRAINT "project_template_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."project_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("auth_user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_role_permissions"
    ADD CONSTRAINT "rbac_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."rbac_permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_role_permissions"
    ADD CONSTRAINT "rbac_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."rbac_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_roles"
    ADD CONSTRAINT "rbac_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rbac_user_roles"
    ADD CONSTRAINT "rbac_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."rbac_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_tasks"
    ADD CONSTRAINT "recurring_tasks_project_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_tasks"
    ADD CONSTRAINT "recurring_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_videos"
    ADD CONSTRAINT "shared_videos_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."video_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shared_videos"
    ADD CONSTRAINT "shared_videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_audit_log"
    ADD CONSTRAINT "support_audit_log_support_user_id_fkey" FOREIGN KEY ("support_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_audit_log"
    ADD CONSTRAINT "support_audit_log_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."system_admins"
    ADD CONSTRAINT "system_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_files"
    ADD CONSTRAINT "task_files_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_logs"
    ADD CONSTRAINT "task_logs_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_reminders"
    ADD CONSTRAINT "task_reminders_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_status_definitions"
    ADD CONSTRAINT "task_status_definitions_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."tenant_account_events"
    ADD CONSTRAINT "tenant_account_events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."tenant_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_account_events"
    ADD CONSTRAINT "tenant_account_events_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tenant_audit_log"
    ADD CONSTRAINT "tenant_audit_log_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."tenant_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenant_audit_log"
    ADD CONSTRAINT "tenant_audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tenant_invoices"
    ADD CONSTRAINT "tenant_invoices_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."tenant_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."tenant_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."time_entry_events"
    ADD CONSTRAINT "time_entry_events_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_project_favorites"
    ADD CONSTRAINT "user_project_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_system_role_id_fkey" FOREIGN KEY ("system_role_id") REFERENCES "public"."system_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_guest_of_user_id_fkey" FOREIGN KEY ("guest_of_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."video_folders"
    ADD CONSTRAINT "video_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Account owner can manage invitations" ON "public"."invitations" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'owner'::"text")))));



CREATE POLICY "Admin access tenant_account_events" ON "public"."tenant_account_events" TO "authenticated" USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



CREATE POLICY "Admin access tenant_accounts" ON "public"."tenant_accounts" TO "authenticated" USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



CREATE POLICY "Admin access tenant_audit_log" ON "public"."tenant_audit_log" TO "authenticated" USING ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type"));



CREATE POLICY "Admin access tenant_invoices" ON "public"."tenant_invoices" TO "authenticated" USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



CREATE POLICY "Admin access tenant_users" ON "public"."tenant_users" TO "authenticated" USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



CREATE POLICY "Admin users can assign system roles" ON "public"."user_system_roles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admin users can delete system role assignments" ON "public"."user_system_roles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admin users can view system role assignments" ON "public"."user_system_roles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admin users can view system roles" ON "public"."system_roles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete users" ON "public"."users" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."auth_user_id" = "auth"."uid"()) AND ("admin_user"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert users" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Admins can update any user" ON "public"."users" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."auth_user_id" = "auth"."uid"()) AND ("admin_user"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."auth_user_id" = "auth"."uid"()) AND ("admin_user"."role" = 'admin'::"text")))));



CREATE POLICY "All authenticated users can view project template subtasks" ON "public"."project_template_subtasks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view project template tasks" ON "public"."project_template_tasks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view project templates" ON "public"."project_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All users can delete task templates" ON "public"."task_templates" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "All users can update task templates" ON "public"."task_templates" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "All users can view task templates" ON "public"."task_templates" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Any authenticated user can update projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can insert portal comments" ON "public"."portal_comments" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can view active plans" ON "public"."subscription_plans" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Authenticated users can delete all tasks" ON "public"."tasks" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update all tasks" ON "public"."tasks" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all comments" ON "public"."comments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all tasks" ON "public"."tasks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view task files" ON "public"."task_files" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable users to view their own data only" ON "public"."users_email_duplicates" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "auth_user_id"));



CREATE POLICY "Org read" ON "public"."projects" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."organization_id" = "projects"."organization_id")))));



CREATE POLICY "Platform admins can manage memberships" ON "public"."user_organizations" TO "authenticated" USING ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type")) WITH CHECK ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type"));



CREATE POLICY "Platform admins can manage organizations" ON "public"."organizations" TO "authenticated" USING ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type")) WITH CHECK ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type"));



CREATE POLICY "Platform admins can manage system roles" ON "public"."system_roles" USING ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type")) WITH CHECK ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type"));



CREATE POLICY "Platform admins can manage user system roles" ON "public"."user_system_roles" TO "authenticated" USING ("public"."can_assign_system_roles"("auth"."uid"())) WITH CHECK ("public"."can_assign_system_roles"("auth"."uid"()));



CREATE POLICY "Platform admins can view all audit logs" ON "public"."support_audit_log" FOR SELECT USING ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type"));



CREATE POLICY "Platform admins can view all memberships" ON "public"."user_organizations" FOR SELECT TO "authenticated" USING ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type"));



CREATE POLICY "Platform admins can view all organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type"));



CREATE POLICY "Portal owners can view comments" ON "public"."portal_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."client_portals" "cp"
  WHERE (("cp"."id" = "portal_comments"."portal_id") AND ("cp"."created_by" = "auth"."uid"())))));



CREATE POLICY "Project owners can add channel members" ON "public"."channel_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."channels" "c"
     JOIN "public"."projects" "p" ON (("c"."project_id" = "p"."id")))
  WHERE (("c"."id" = "channel_members"."channel_id") AND ("p"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "Project owners can manage their portals" ON "public"."client_portals" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Public can view specific shared videos by ID" ON "public"."shared_videos" FOR SELECT USING (("expires_at" > "now"()));



CREATE POLICY "Service role can manage thread mappings" ON "public"."google_chat_thread_mappings" USING (true) WITH CHECK (true);



CREATE POLICY "Support users can view their own audit logs" ON "public"."support_audit_log" FOR SELECT USING (("support_user_id" = "auth"."uid"()));



CREATE POLICY "System admins can view all clients across accounts" ON "public"."clients" FOR SELECT USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



CREATE POLICY "System admins can view all projects across accounts" ON "public"."projects" FOR SELECT USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



CREATE POLICY "System admins can view all tasks across accounts" ON "public"."tasks" FOR SELECT USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



CREATE POLICY "System admins can view all users across accounts" ON "public"."users" FOR SELECT USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



CREATE POLICY "System admins can view system roles" ON "public"."system_roles" FOR SELECT USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



CREATE POLICY "System can insert reminders" ON "public"."project_reminders" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert reminders" ON "public"."task_reminders" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert usage" ON "public"."usage_tracking" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "System users can insert audit logs" ON "public"."support_audit_log" FOR INSERT WITH CHECK ((("support_user_id" = "auth"."uid"()) AND ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type"))));



CREATE POLICY "Users can add their own favorites" ON "public"."user_project_favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can add their own reactions" ON "public"."comment_reactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create channels in their projects only" ON "public"."channels" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "channels"."project_id") AND ("p"."auth_user_id" = "auth"."uid"())))) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can create files for accessible tasks" ON "public"."task_files" FOR INSERT WITH CHECK ((("auth"."uid"() = "auth_user_id") AND (EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "task_files"."task_id") AND (("t"."auth_user_id" = "auth"."uid"()) OR ("t"."assignee_id" = ("auth"."uid"())::"text") OR (("auth"."uid"())::"text" = ANY ("t"."collaborator_ids"))))))));



CREATE POLICY "Users can create mentions" ON "public"."mentions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create reactions" ON "public"."message_reactions" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can create their own check-ins" ON "public"."check_ins" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = "auth_user_id"));



CREATE POLICY "Users can create their own clients" ON "public"."clients" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own custom fields" ON "public"."custom_fields" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own custom roles" ON "public"."custom_roles" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own email templates" ON "public"."email_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own folders" ON "public"."video_folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own native field configs" ON "public"."native_field_configs" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own notes" ON "public"."notes" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own project files" ON "public"."project_files" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own project folders" ON "public"."project_folders" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own project notes" ON "public"."project_notes" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own project status definitions" ON "public"."project_status_definitions" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own project template subtasks" ON "public"."project_template_subtasks" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own project template tasks" ON "public"."project_template_tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own project templates" ON "public"."project_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own purchases" ON "public"."purchases" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own recurring tasks" ON "public"."recurring_tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own task logs" ON "public"."task_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own task status definitions" ON "public"."task_status_definitions" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own task templates" ON "public"."task_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own tasks" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own teams" ON "public"."teams" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own time entries" ON "public"."time_entries" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can create their own videos" ON "public"."shared_videos" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create time entry events" ON "public"."time_entry_events" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own channels" ON "public"."channels" FOR DELETE USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "channels"."project_id") AND ("p"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete their own check-ins" ON "public"."check_ins" FOR DELETE USING ((("auth"."uid"())::"text" = "auth_user_id"));



CREATE POLICY "Users can delete their own clients" ON "public"."clients" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own custom fields" ON "public"."custom_fields" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own custom roles" ON "public"."custom_roles" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own email templates" ON "public"."email_templates" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own favorites" ON "public"."user_project_favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own folders" ON "public"."video_folders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own integration settings" ON "public"."integration_settings" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own native field configs" ON "public"."native_field_configs" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own notes" ON "public"."notes" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own project files" ON "public"."project_files" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own project folders" ON "public"."project_folders" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own project notes" ON "public"."project_notes" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own project status definitions" ON "public"."project_status_definitions" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own project template subtasks" ON "public"."project_template_subtasks" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own project template tasks" ON "public"."project_template_tasks" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own project templates" ON "public"."project_templates" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own projects" ON "public"."projects" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own purchases" ON "public"."purchases" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own reactions" ON "public"."message_reactions" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can delete their own recurring tasks" ON "public"."recurring_tasks" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own task files" ON "public"."task_files" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own task logs" ON "public"."task_logs" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own task status definitions" ON "public"."task_status_definitions" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own tasks" ON "public"."tasks" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own teams" ON "public"."teams" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own time entries" ON "public"."time_entries" FOR DELETE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can delete their own videos" ON "public"."shared_videos" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can insert their own integration settings" ON "public"."integration_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can insert their own row" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can insert their own subscription" ON "public"."account_subscriptions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can leave channels or owners can remove members" ON "public"."channel_members" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."channels" "c"
     JOIN "public"."projects" "p" ON (("c"."project_id" = "p"."id")))
  WHERE (("c"."id" = "channel_members"."channel_id") AND ("p"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can remove their own reactions" ON "public"."comment_reactions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can select their own row" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own channels" ON "public"."channels" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "channels"."project_id") AND ("p"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their own check-ins" ON "public"."check_ins" FOR UPDATE USING ((("auth"."uid"())::"text" = "auth_user_id"));



CREATE POLICY "Users can update their own clients" ON "public"."clients" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own custom fields" ON "public"."custom_fields" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own custom roles" ON "public"."custom_roles" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own email templates" ON "public"."email_templates" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own folders" ON "public"."video_folders" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own integration settings" ON "public"."integration_settings" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own native field configs" ON "public"."native_field_configs" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own notes" ON "public"."notes" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own project files" ON "public"."project_files" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own project folders" ON "public"."project_folders" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own project notes" ON "public"."project_notes" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own project status definitions" ON "public"."project_status_definitions" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own project template subtasks" ON "public"."project_template_subtasks" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own project template tasks" ON "public"."project_template_tasks" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own project templates" ON "public"."project_templates" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own purchases" ON "public"."purchases" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own recurring tasks" ON "public"."recurring_tasks" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own row" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "auth_user_id")) WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own subscription" ON "public"."account_subscriptions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own task files" ON "public"."task_files" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own task logs" ON "public"."task_logs" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own task status definitions" ON "public"."task_status_definitions" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own teams" ON "public"."teams" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update their own videos" ON "public"."shared_videos" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update time entries" ON "public"."time_entries" FOR UPDATE USING ((("auth"."uid"() = "auth_user_id") OR "public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type") OR (("organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "time_entries"."organization_id") AND (("uo"."role" = 'admin'::"text") OR ("uo"."role" = 'owner'::"text")))))) OR (("project_id" IS NOT NULL) AND ("project_id" <> ''::"text") AND (EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = ("time_entries"."project_id")::"uuid") AND (("p"."auth_user_id" = "auth"."uid"()) OR ("p"."owner_id" = "auth"."uid"()))))))));



CREATE POLICY "Users can view all check-ins" ON "public"."check_ins" FOR SELECT USING (true);



CREATE POLICY "Users can view all comment reactions" ON "public"."comment_reactions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view all time entry events in their org" ON "public"."time_entry_events" FOR SELECT USING (true);



CREATE POLICY "Users can view authorized channels only" ON "public"."channels" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "channels"."id") AND ("cm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "channels"."project_id") AND ("p"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view channel members" ON "public"."channel_members" FOR SELECT TO "authenticated" USING ((("channel_id" IN ( SELECT "cm"."channel_id"
   FROM "public"."channel_members" "cm"
  WHERE ("cm"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM ("public"."channels" "c"
     JOIN "public"."projects" "p" ON (("c"."project_id" = "p"."id")))
  WHERE (("c"."id" = "channel_members"."channel_id") AND ("p"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view clients for accessible projects" ON "public"."clients" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."client_id" = "clients"."id") AND (("p"."auth_user_id" = "auth"."uid"()) OR (("auth"."uid"())::"text" = ANY ("p"."collaborator_ids")) OR (("auth"."uid"())::"text" = ANY ("p"."watcher_ids")))))));



CREATE POLICY "Users can view files for viewable projects" ON "public"."project_files" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "project_files"."project_id") AND (("p"."auth_user_id" = "auth"."uid"()) OR (("auth"."uid"())::"text" = ANY ("p"."collaborator_ids")) OR (("auth"."uid"())::"text" = ANY ("p"."watcher_ids")) OR (EXISTS ( SELECT 1
           FROM "public"."user_organizations" "uo"
          WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "p"."organization_id")))) OR "public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type"))))));



CREATE POLICY "Users can view folders for accessible projects" ON "public"."project_folders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "project_folders"."project_id") AND (("p"."auth_user_id" = "auth"."uid"()) OR (("auth"."uid"())::"text" = ANY ("p"."collaborator_ids")) OR (("auth"."uid"())::"text" = ANY ("p"."watcher_ids")))))));



CREATE POLICY "Users can view mentions" ON "public"."mentions" FOR SELECT USING (true);



CREATE POLICY "Users can view message reactions" ON "public"."message_reactions" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view notes for accessible projects" ON "public"."project_notes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "project_notes"."project_id") AND (("p"."auth_user_id" = "auth"."uid"()) OR (("auth"."uid"())::"text" = ANY ("p"."collaborator_ids")) OR (("auth"."uid"())::"text" = ANY ("p"."watcher_ids")))))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own usage" ON "public"."usage_tracking" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view projects they own or collaborate on" ON "public"."projects" FOR SELECT USING ((("auth"."uid"() = "auth_user_id") OR (("auth"."uid"())::"text" = ANY ("collaborator_ids"))));



CREATE POLICY "Users can view reminders for their projects" ON "public"."project_reminders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "project_reminders"."project_id") AND ("p"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view reminders for their tasks" ON "public"."task_reminders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "task_reminders"."task_id") AND ("t"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their organization memberships" ON "public"."user_organizations" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."organization_id" = "uo"."id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own clients" ON "public"."clients" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own custom fields" ON "public"."custom_fields" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own custom roles" ON "public"."custom_roles" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own email templates" ON "public"."email_templates" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own favorites" ON "public"."user_project_favorites" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own folders" ON "public"."video_folders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own integration settings" ON "public"."integration_settings" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own native field configs" ON "public"."native_field_configs" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own notes" ON "public"."notes" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own project status definitions" ON "public"."project_status_definitions" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own purchases" ON "public"."purchases" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own recurring tasks" ON "public"."recurring_tasks" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own subscription" ON "public"."account_subscriptions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own system roles" ON "public"."user_system_roles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own task logs" ON "public"."task_logs" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own task status definitions" ON "public"."task_status_definitions" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own task templates" ON "public"."task_templates" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own teams" ON "public"."teams" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view their own videos" ON "public"."shared_videos" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view users in their organization" ON "public"."users" FOR SELECT TO "authenticated" USING ((("auth_user_id" = "auth"."uid"()) OR (("organization_id" IS NOT NULL) AND ("organization_id" = "public"."get_current_user_organization"())) OR ("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type"))));



CREATE POLICY "Users can view workspace time entries" ON "public"."time_entries" FOR SELECT USING ((("auth"."uid"() = "auth_user_id") OR (("auth"."uid"())::"text" = "user_id") OR "public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type") OR (("organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "time_entries"."organization_id"))))) OR (("project_id" IS NOT NULL) AND ("project_id" <> ''::"text") AND (EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = ("time_entries"."project_id")::"uuid") AND (("p"."auth_user_id" = "auth"."uid"()) OR (("auth"."uid"())::"text" = ANY ("p"."collaborator_ids")) OR (("auth"."uid"())::"text" = ANY ("p"."watcher_ids"))))))) OR (("task_id" IS NOT NULL) AND ("task_id" <> ''::"text") AND (EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = ("time_entries"."task_id")::"uuid") AND (("t"."auth_user_id" = "auth"."uid"()) OR (("auth"."uid"())::"text" = "t"."assignee_id") OR (("auth"."uid"())::"text" = ANY ("t"."collaborator_ids")))))))));



ALTER TABLE "public"."account_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channel_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."check_ins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_portals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comment_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_chat_thread_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integration_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."native_field_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_status_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_template_subtasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_template_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rbac_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rbac_permissions_delete" ON "public"."rbac_permissions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_permissions_insert" ON "public"."rbac_permissions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_permissions_modify" ON "public"."rbac_permissions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "rbac_permissions_select" ON "public"."rbac_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rbac_permissions_update" ON "public"."rbac_permissions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



ALTER TABLE "public"."rbac_resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rbac_resources_delete" ON "public"."rbac_resources" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_resources_insert" ON "public"."rbac_resources" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_resources_modify" ON "public"."rbac_resources" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "rbac_resources_select" ON "public"."rbac_resources" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rbac_resources_update" ON "public"."rbac_resources" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



ALTER TABLE "public"."rbac_role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rbac_role_permissions_delete" ON "public"."rbac_role_permissions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_role_permissions_insert" ON "public"."rbac_role_permissions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_role_permissions_modify" ON "public"."rbac_role_permissions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "rbac_role_permissions_select" ON "public"."rbac_role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rbac_role_permissions_update" ON "public"."rbac_role_permissions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



ALTER TABLE "public"."rbac_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rbac_roles_delete" ON "public"."rbac_roles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_roles_insert" ON "public"."rbac_roles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_roles_modify" ON "public"."rbac_roles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "rbac_roles_select" ON "public"."rbac_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rbac_roles_update" ON "public"."rbac_roles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



ALTER TABLE "public"."rbac_user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rbac_user_roles_delete" ON "public"."rbac_user_roles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_user_roles_insert" ON "public"."rbac_user_roles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



CREATE POLICY "rbac_user_roles_modify" ON "public"."rbac_user_roles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "rbac_user_roles_select" ON "public"."rbac_user_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rbac_user_roles_update" ON "public"."rbac_user_roles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_system_roles" "usr"
     JOIN "public"."system_roles" "sr" ON (("sr"."id" = "usr"."system_role_id")))
  WHERE (("usr"."user_id" = "auth"."uid"()) AND ("sr"."name" = 'platform_admin'::"public"."system_role_type")))));



ALTER TABLE "public"."recurring_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "secure_channel_messages_view" ON "public"."messages" FOR SELECT TO "authenticated" USING ((("channel_id" IS NOT NULL) AND "public"."is_channel_member"("channel_id")));



CREATE POLICY "secure_direct_messages_view" ON "public"."messages" FOR SELECT USING ((("channel_id" IS NULL) AND ((("auth"."uid"())::"text" = "from_user_id") OR (("auth"."uid"())::"text" = "to_user_id") OR ("from_user_id" = 'system'::"text"))));



CREATE POLICY "secure_message_creation" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "auth_user_id") AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE ((("users"."auth_user_id")::"text" = "messages"."from_user_id") AND ("users"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "secure_message_delete" ON "public"."messages" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "secure_message_update" ON "public"."messages" FOR UPDATE USING ((("auth"."uid"() = "auth_user_id") OR (("auth"."uid"())::"text" = "to_user_id"))) WITH CHECK ((("auth"."uid"() = "auth_user_id") OR (("auth"."uid"())::"text" = "to_user_id")));



ALTER TABLE "public"."shared_videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_admins_select" ON "public"."system_admins" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "system_admins_view_all_messages" ON "public"."messages" FOR SELECT TO "authenticated" USING (("public"."has_system_role"("auth"."uid"(), 'platform_admin'::"public"."system_role_type") OR "public"."has_system_role"("auth"."uid"(), 'support_admin'::"public"."system_role_type")));



ALTER TABLE "public"."system_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_status_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_account_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_entry_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_project_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_system_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_can_view_their_messages" ON "public"."messages" FOR SELECT USING (((("auth"."uid"())::"text" = "to_user_id") OR (("auth"."uid"())::"text" = "from_user_id") OR ("from_user_id" = 'system'::"text")));



ALTER TABLE "public"."users_email_duplicates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_folders" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."comments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_reactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."projects";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."task_files";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tasks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."time_entries";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




































































































































































































































































































































GRANT ALL ON FUNCTION "public"."auto_log_time_entry_started"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_log_time_entry_started"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_log_time_entry_started"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_log_time_entry_stopped"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_log_time_entry_stopped"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_log_time_entry_stopped"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_assign_system_roles"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_assign_system_roles"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_assign_system_roles"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_user_perform_action"("action_type" "text", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_perform_action"("action_type" "text", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_perform_action"("action_type" "text", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_videos"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_videos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_videos"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_user_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_user_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_user_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_project_channel"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_project_channel"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_project_channel"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_account_limits"("account_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_account_limits"("account_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_limits"("account_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_organization"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_organization"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_organization"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_portal_data"("portal_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_portal_data"("portal_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_portal_data"("portal_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_workspace_id"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_workspace_id"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_workspace_id"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_system_role"("_user_id" "uuid", "_role" "public"."system_role_type") TO "anon";
GRANT ALL ON FUNCTION "public"."has_system_role"("_user_id" "uuid", "_role" "public"."system_role_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_system_role"("_user_id" "uuid", "_role" "public"."system_role_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_channel_member"("cid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_channel_member"("cid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_channel_member"("cid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_support_action"("_action" "text", "_target_user_id" "uuid", "_details" "jsonb", "_ip_address" "inet") TO "anon";
GRANT ALL ON FUNCTION "public"."log_support_action"("_action" "text", "_target_user_id" "uuid", "_details" "jsonb", "_ip_address" "inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_support_action"("_action" "text", "_target_user_id" "uuid", "_details" "jsonb", "_ip_address" "inet") TO "service_role";



GRANT ALL ON FUNCTION "public"."rbac_user_has_permission"("_user_id" "uuid", "_resource" "text", "_action" "text", "_required_scope" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rbac_user_has_permission"("_user_id" "uuid", "_resource" "text", "_action" "text", "_required_scope" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rbac_user_has_permission"("_user_id" "uuid", "_resource" "text", "_action" "text", "_required_scope" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_timer_status_with_end_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_timer_status_with_end_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_timer_status_with_end_time"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_usage"("resource_type_param" "text", "resource_id_param" "uuid", "amount_param" numeric, "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."track_usage"("resource_type_param" "text", "resource_id_param" "uuid", "amount_param" numeric, "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_usage"("resource_type_param" "text", "resource_id_param" "uuid", "amount_param" numeric, "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_check_ins_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_check_ins_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_check_ins_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_client_portals_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_client_portals_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_client_portals_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_email_templates_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_email_templates_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_email_templates_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_native_field_configs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_native_field_configs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_native_field_configs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organizations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_organizations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organizations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_notes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_project_notes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_notes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_rbac_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_rbac_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_rbac_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tenant_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tenant_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tenant_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_belongs_to_organization"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_belongs_to_organization"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_belongs_to_organization"("org_id" "uuid") TO "service_role";



























GRANT ALL ON TABLE "public"."account_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."account_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."account_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."channel_members" TO "anon";
GRANT ALL ON TABLE "public"."channel_members" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_members" TO "service_role";



GRANT ALL ON TABLE "public"."channels" TO "anon";
GRANT ALL ON TABLE "public"."channels" TO "authenticated";
GRANT ALL ON TABLE "public"."channels" TO "service_role";



GRANT ALL ON TABLE "public"."check_ins" TO "anon";
GRANT ALL ON TABLE "public"."check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."client_portals" TO "anon";
GRANT ALL ON TABLE "public"."client_portals" TO "authenticated";
GRANT ALL ON TABLE "public"."client_portals" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."comment_reactions" TO "anon";
GRANT ALL ON TABLE "public"."comment_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."custom_fields" TO "anon";
GRANT ALL ON TABLE "public"."custom_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_fields" TO "service_role";



GRANT ALL ON TABLE "public"."custom_roles" TO "anon";
GRANT ALL ON TABLE "public"."custom_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_roles" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."google_chat_thread_mappings" TO "anon";
GRANT ALL ON TABLE "public"."google_chat_thread_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."google_chat_thread_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."integration_settings" TO "anon";
GRANT ALL ON TABLE "public"."integration_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_settings" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."mentions" TO "anon";
GRANT ALL ON TABLE "public"."mentions" TO "authenticated";
GRANT ALL ON TABLE "public"."mentions" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."native_field_configs" TO "anon";
GRANT ALL ON TABLE "public"."native_field_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."native_field_configs" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."portal_comments" TO "anon";
GRANT ALL ON TABLE "public"."portal_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_comments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_files" TO "anon";
GRANT ALL ON TABLE "public"."project_files" TO "authenticated";
GRANT ALL ON TABLE "public"."project_files" TO "service_role";



GRANT ALL ON TABLE "public"."project_folders" TO "anon";
GRANT ALL ON TABLE "public"."project_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."project_folders" TO "service_role";



GRANT ALL ON TABLE "public"."project_notes" TO "anon";
GRANT ALL ON TABLE "public"."project_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."project_notes" TO "service_role";



GRANT ALL ON TABLE "public"."project_reminders" TO "anon";
GRANT ALL ON TABLE "public"."project_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."project_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."project_status_definitions" TO "anon";
GRANT ALL ON TABLE "public"."project_status_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."project_status_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."project_template_subtasks" TO "anon";
GRANT ALL ON TABLE "public"."project_template_subtasks" TO "authenticated";
GRANT ALL ON TABLE "public"."project_template_subtasks" TO "service_role";



GRANT ALL ON TABLE "public"."project_template_tasks" TO "anon";
GRANT ALL ON TABLE "public"."project_template_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."project_template_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."project_templates" TO "anon";
GRANT ALL ON TABLE "public"."project_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."project_templates" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."purchases" TO "anon";
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_permissions" TO "anon";
GRANT ALL ON TABLE "public"."rbac_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_resources" TO "anon";
GRANT ALL ON TABLE "public"."rbac_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_resources" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."rbac_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_roles" TO "anon";
GRANT ALL ON TABLE "public"."rbac_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_roles" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."rbac_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_tasks" TO "anon";
GRANT ALL ON TABLE "public"."recurring_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."shared_videos" TO "anon";
GRANT ALL ON TABLE "public"."shared_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_videos" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."support_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."support_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."support_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."system_admins" TO "anon";
GRANT ALL ON TABLE "public"."system_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."system_admins" TO "service_role";



GRANT ALL ON TABLE "public"."system_roles" TO "anon";
GRANT ALL ON TABLE "public"."system_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."system_roles" TO "service_role";



GRANT ALL ON TABLE "public"."task_files" TO "anon";
GRANT ALL ON TABLE "public"."task_files" TO "authenticated";
GRANT ALL ON TABLE "public"."task_files" TO "service_role";



GRANT ALL ON TABLE "public"."task_logs" TO "anon";
GRANT ALL ON TABLE "public"."task_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."task_logs" TO "service_role";



GRANT ALL ON TABLE "public"."task_reminders" TO "anon";
GRANT ALL ON TABLE "public"."task_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."task_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."task_status_definitions" TO "anon";
GRANT ALL ON TABLE "public"."task_status_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_status_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."task_templates" TO "anon";
GRANT ALL ON TABLE "public"."task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_account_events" TO "anon";
GRANT ALL ON TABLE "public"."tenant_account_events" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_account_events" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_accounts" TO "anon";
GRANT ALL ON TABLE "public"."tenant_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."tenant_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_invoices" TO "anon";
GRANT ALL ON TABLE "public"."tenant_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_users" TO "anon";
GRANT ALL ON TABLE "public"."tenant_users" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_users" TO "service_role";



GRANT ALL ON TABLE "public"."test" TO "anon";
GRANT ALL ON TABLE "public"."test" TO "authenticated";
GRANT ALL ON TABLE "public"."test" TO "service_role";



GRANT ALL ON SEQUENCE "public"."test_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."test_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."test_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."time_entry_events" TO "anon";
GRANT ALL ON TABLE "public"."time_entry_events" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entry_events" TO "service_role";



GRANT ALL ON TABLE "public"."usage_tracking" TO "anon";
GRANT ALL ON TABLE "public"."usage_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."user_organizations" TO "anon";
GRANT ALL ON TABLE "public"."user_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."user_project_favorites" TO "anon";
GRANT ALL ON TABLE "public"."user_project_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."user_project_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."user_system_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_system_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_system_roles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."users_email_duplicates" TO "anon";
GRANT ALL ON TABLE "public"."users_email_duplicates" TO "authenticated";
GRANT ALL ON TABLE "public"."users_email_duplicates" TO "service_role";



GRANT ALL ON TABLE "public"."video_folders" TO "anon";
GRANT ALL ON TABLE "public"."video_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."video_folders" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























