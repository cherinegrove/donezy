import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface TaskRequest {
  title: string
  description?: string
  project_id: string
  assignee_id?: string
  status?: string
  priority?: string
  due_date?: string
  collaborator_ids?: string[]
}

async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify API key: hash the provided secret and look up a non-revoked match.
    // Keys are scoped to an organization, not a single user.
    const keyHash = await hashApiKey(apiKey)
    const { data: apiKeyRow, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, organization_id, user_id, revoked_at')
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .single()

    if (apiKeyError || !apiKeyRow) {
      return new Response(
        JSON.stringify({ error: 'Invalid or revoked API key' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!apiKeyRow.user_id) {
      return new Response(
        JSON.stringify({ error: 'API key has no associated user and cannot create records' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const taskData: TaskRequest = await req.json()

    // Validate required fields
    if (!taskData.title || !taskData.project_id) {
      return new Response(
        JSON.stringify({ error: 'Title and project_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify project exists and belongs to the key's organization (not just one user)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', taskData.project_id)
      .eq('organization_id', apiKeyRow.organization_id)
      .single()

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description || '',
        project_id: taskData.project_id,
        assignee_id: taskData.assignee_id || null,
        status: taskData.status || 'backlog',
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || null,
        collaborator_ids: taskData.collaborator_ids || [],
        auth_user_id: apiKeyRow.user_id,
        organization_id: apiKeyRow.organization_id
      })
      .select()
      .single()

    if (taskError) {
      console.error('Task creation error:', taskError)
      return new Response(
        JSON.stringify({ error: 'Failed to create task', details: taskError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        task: task,
        message: 'Task created successfully'
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
