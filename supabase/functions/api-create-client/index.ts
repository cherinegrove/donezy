import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface ClientRequest {
  name: string
  email: string
  phone?: string
  website?: string
  address?: string
  status?: string
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

    // Verify API key belongs to a valid user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('id', apiKey)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }), 
        { 
          status: 401, 
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

    const clientData: ClientRequest = await req.json()

    // Validate required fields
    if (!clientData.name || !clientData.email) {
      return new Response(
        JSON.stringify({ error: 'Name and email are required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(clientData.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if client with this email already exists for this user
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('email', clientData.email)
      .eq('auth_user_id', user.auth_user_id)
      .single()

    if (existingClient) {
      return new Response(
        JSON.stringify({ error: 'Client with this email already exists' }), 
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone || null,
        website: clientData.website || null,
        address: clientData.address || null,
        status: clientData.status || 'active',
        auth_user_id: user.auth_user_id
      })
      .select()
      .single()

    if (clientError) {
      console.error('Client creation error:', clientError)
      return new Response(
        JSON.stringify({ error: 'Failed to create client', details: clientError.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        client: client,
        message: 'Client created successfully' 
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