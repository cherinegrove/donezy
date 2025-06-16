
-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create policies for teams
CREATE POLICY "Users can view their own teams" ON public.teams FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can create their own teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own teams" ON public.teams FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete their own teams" ON public.teams FOR DELETE USING (auth.uid() = auth_user_id);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  task_id TEXT,
  project_id TEXT,
  client_id TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on time_entries
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for time_entries
CREATE POLICY "Users can view their own time entries" ON public.time_entries FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can create their own time entries" ON public.time_entries FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own time entries" ON public.time_entries FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete their own time entries" ON public.time_entries FOR DELETE USING (auth.uid() = auth_user_id);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can create their own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete their own messages" ON public.messages FOR DELETE USING (auth.uid() = auth_user_id);

-- Create purchases table
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT,
  item_name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  receipt_url TEXT,
  category TEXT,
  approved BOOLEAN DEFAULT false,
  approved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for purchases
CREATE POLICY "Users can view their own purchases" ON public.purchases FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can create their own purchases" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own purchases" ON public.purchases FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete their own purchases" ON public.purchases FOR DELETE USING (auth.uid() = auth_user_id);

-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policies for notes
CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can create their own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (auth.uid() = auth_user_id);

-- Create custom_roles table
CREATE TABLE public.custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on custom_roles
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_roles
CREATE POLICY "Users can view their own custom roles" ON public.custom_roles FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can create their own custom roles" ON public.custom_roles FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own custom roles" ON public.custom_roles FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete their own custom roles" ON public.custom_roles FOR DELETE USING (auth.uid() = auth_user_id);

-- Create task_logs table
CREATE TABLE public.task_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_logs
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for task_logs
CREATE POLICY "Users can view their own task logs" ON public.task_logs FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can create their own task logs" ON public.task_logs FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own task logs" ON public.task_logs FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete their own task logs" ON public.task_logs FOR DELETE USING (auth.uid() = auth_user_id);

-- Create task_status_definitions table
CREATE TABLE public.task_status_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_status_definitions
ALTER TABLE public.task_status_definitions ENABLE ROW LEVEL SECURITY;

-- Create policies for task_status_definitions
CREATE POLICY "Users can view their own task status definitions" ON public.task_status_definitions FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can create their own task status definitions" ON public.task_status_definitions FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own task status definitions" ON public.task_status_definitions FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete their own task status definitions" ON public.task_status_definitions FOR DELETE USING (auth.uid() = auth_user_id);

-- Create project_status_definitions table
CREATE TABLE public.project_status_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_status_definitions
ALTER TABLE public.project_status_definitions ENABLE ROW LEVEL SECURITY;

-- Create policies for project_status_definitions
CREATE POLICY "Users can view their own project status definitions" ON public.project_status_definitions FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can create their own project status definitions" ON public.project_status_definitions FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own project status definitions" ON public.project_status_definitions FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete their own project status definitions" ON public.project_status_definitions FOR DELETE USING (auth.uid() = auth_user_id);
