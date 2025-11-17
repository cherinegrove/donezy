import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecurringTask {
  id: string
  auth_user_id: string
  title: string
  description: string | null
  project_id: string
  assignee_id: string | null
  priority: string
  collaborator_ids: string[]
  estimated_hours: number | null
  recurrence_pattern: string
  recurrence_interval: number
  days_of_week: number[] | null
  day_of_month: number | null
  start_date: string
  end_date: string | null
  next_generation_date: string
  last_generated_date: string | null
  is_active: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()
    console.log('Starting recurring task generation at:', now.toISOString())

    // Fetch all active recurring tasks that need generation
    const { data: recurringTasks, error: fetchError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('is_active', true)
      .lte('next_generation_date', now.toISOString())

    if (fetchError) {
      console.error('Error fetching recurring tasks:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recurring tasks', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${recurringTasks?.length || 0} recurring tasks to process`)

    const results = []

    for (const recurringTask of recurringTasks || []) {
      try {
        // Check if end date has passed
        if (recurringTask.end_date && new Date(recurringTask.end_date) < now) {
          console.log(`Recurring task ${recurringTask.id} has ended, deactivating`)
          await supabase
            .from('recurring_tasks')
            .update({ is_active: false })
            .eq('id', recurringTask.id)
          continue
        }

        // Calculate due date based on next generation date
        const dueDate = new Date(recurringTask.next_generation_date)
        dueDate.setHours(23, 59, 59, 999) // Set to end of day

        // Create the task
        const { data: newTask, error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: recurringTask.title,
            description: recurringTask.description,
            project_id: recurringTask.project_id,
            assignee_id: recurringTask.assignee_id,
            priority: recurringTask.priority,
            collaborator_ids: recurringTask.collaborator_ids,
            estimated_hours: recurringTask.estimated_hours,
            status: 'backlog',
            due_date: dueDate.toISOString(),
            auth_user_id: recurringTask.auth_user_id
          })
          .select()
          .single()

        if (taskError) {
          console.error(`Error creating task for recurring task ${recurringTask.id}:`, taskError)
          results.push({ recurringTaskId: recurringTask.id, success: false, error: taskError.message })
          continue
        }

        console.log(`Created task ${newTask.id} from recurring task ${recurringTask.id}`)

        // Calculate next generation date
        const nextDate = calculateNextGenerationDate(
          recurringTask.recurrence_pattern,
          recurringTask.recurrence_interval,
          new Date(recurringTask.next_generation_date),
          recurringTask.days_of_week,
          recurringTask.day_of_month
        )

        // Update recurring task
        const { error: updateError } = await supabase
          .from('recurring_tasks')
          .update({
            last_generated_date: now.toISOString(),
            next_generation_date: nextDate.toISOString()
          })
          .eq('id', recurringTask.id)

        if (updateError) {
          console.error(`Error updating recurring task ${recurringTask.id}:`, updateError)
        }

        results.push({ 
          recurringTaskId: recurringTask.id, 
          taskId: newTask.id,
          success: true,
          nextGenerationDate: nextDate.toISOString()
        })
      } catch (error) {
        console.error(`Error processing recurring task ${recurringTask.id}:`, error)
        results.push({ recurringTaskId: recurringTask.id, success: false, error: String(error) })
      }
    }

    console.log('Recurring task generation completed:', results)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateNextGenerationDate(
  pattern: string,
  interval: number,
  currentDate: Date,
  daysOfWeek: number[] | null,
  dayOfMonth: number | null
): Date {
  const next = new Date(currentDate)

  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      break

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next occurrence of specified days
        let daysToAdd = 1
        const currentDayOfWeek = next.getDay()
        
        // Sort days and find next occurrence
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b)
        let foundDay = false
        
        for (const targetDay of sortedDays) {
          if (targetDay > currentDayOfWeek) {
            daysToAdd = targetDay - currentDayOfWeek
            foundDay = true
            break
          }
        }
        
        // If no day found in current week, go to first day of next week(s)
        if (!foundDay) {
          daysToAdd = (7 - currentDayOfWeek) + sortedDays[0] + (7 * (interval - 1))
        }
        
        next.setDate(next.getDate() + daysToAdd)
      } else {
        next.setDate(next.getDate() + (7 * interval))
      }
      break

    case 'monthly':
      if (dayOfMonth) {
        next.setMonth(next.getMonth() + interval)
        next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
      } else {
        next.setMonth(next.getMonth() + interval)
      }
      break

    default:
      next.setDate(next.getDate() + interval)
  }

  return next
}
