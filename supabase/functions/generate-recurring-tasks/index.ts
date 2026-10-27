import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Donezy schedules are in South African time (UTC+2, no daylight saving).
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_DAYS_AHEAD = 800

interface RecurringTask {
  id: string
  auth_user_id: string
  title: string
  description: string | null
  project_id: string
  assignee_id: string | null
  priority: string
  status: string
  collaborator_ids: string[]
  estimated_hours: number | null
  recurrence_pattern: string
  recurrence_interval: number
  days_of_week: number[] | null
  day_of_month: number | null
  recurrence_time: string | null
  start_date: string
  end_date: string | null
  next_generation_date: string
  is_active: boolean
}

// Whole South African calendar days since the epoch.
const sastDayIndex = (ms: number) => Math.floor((ms + SAST_OFFSET_MS) / DAY_MS)

// Reading a day index with UTC getters gives the South African calendar date.
const dayLabel = (idx: number) => new Date(idx * DAY_MS)

const occurrenceMs = (idx: number, time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return idx * DAY_MS + (hours * 60 + minutes) * 60 * 1000 - SAST_OFFSET_MS
}

const mondayIndex = (idx: number) => idx - ((dayLabel(idx).getUTCDay() + 6) % 7)

function matchesDay(t: RecurringTask, idx: number): boolean {
  const startIdx = sastDayIndex(Date.parse(t.start_date))
  if (idx < startIdx) return false

  const label = dayLabel(idx)
  const weekday = label.getUTCDay()
  const interval = Math.max(1, t.recurrence_interval || 1)
  const days = t.days_of_week ?? []

  switch (t.recurrence_pattern) {
    case 'weekly': {
      if (days.length > 0) {
        const weeksFromStart = Math.round((mondayIndex(idx) - mondayIndex(startIdx)) / 7)
        return days.includes(weekday) && weeksFromStart % interval === 0
      }
      return (idx - startIdx) % (7 * interval) === 0
    }
    case 'monthly': {
      const start = dayLabel(startIdx)
      const monthsFromStart = (label.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (label.getUTCMonth() - start.getUTCMonth())
      if (monthsFromStart < 0 || monthsFromStart % interval !== 0) return false
      const lastDayOfMonth = new Date(Date.UTC(label.getUTCFullYear(), label.getUTCMonth() + 1, 0)).getUTCDate()
      const target = t.day_of_month ?? start.getUTCDate()
      return label.getUTCDate() === Math.min(target, lastDayOfMonth)
    }
    case 'daily':
    default: {
      if (days.length > 0) return days.includes(weekday)
      return (idx - startIdx) % interval === 0
    }
  }
}

// First occurrence strictly after afterMs, or null if none within the search window.
function nextOccurrence(t: RecurringTask, afterMs: number): number | null {
  const time = t.recurrence_time || '08:00'
  let idx = sastDayIndex(afterMs)
  for (let k = 0; k < MAX_DAYS_AHEAD; k++, idx++) {
    const candidate = occurrenceMs(idx, time)
    if (candidate > afterMs && matchesDay(t, idx)) return candidate
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    const { data: templates, error: fetchError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('is_active', true)
      .lte('next_generation_date', nowIso)

    if (fetchError) {
      console.error('Error fetching recurring tasks:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recurring tasks', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: Record<string, unknown>[] = []

    for (const t of (templates || []) as RecurringTask[]) {
      try {
        if (t.end_date && Date.parse(t.end_date) < now) {
          await supabase.from('recurring_tasks').update({ is_active: false }).eq('id', t.id)
          results.push({ recurringTaskId: t.id, action: 'ended' })
          continue
        }

        const due = nextOccurrence(t, Date.parse(t.next_generation_date) - 1)
        if (due === null) {
          await supabase.from('recurring_tasks').update({ is_active: false }).eq('id', t.id)
          results.push({ recurringTaskId: t.id, action: 'no further occurrences' })
          continue
        }

        if (due > now) {
          await supabase
            .from('recurring_tasks')
            .update({ next_generation_date: new Date(due).toISOString() })
            .eq('id', t.id)
            .eq('next_generation_date', t.next_generation_date)
          results.push({ recurringTaskId: t.id, action: 'rescheduled', next: new Date(due).toISOString() })
          continue
        }

        // Claim this occurrence first, so an overlapping run can't create it again.
        const following = nextOccurrence(t, now)
        const { data: claimed, error: claimError } = await supabase
          .from('recurring_tasks')
          .update({
            next_generation_date: following !== null
              ? new Date(following).toISOString()
              : t.next_generation_date,
            is_active: following !== null,
            last_generated_date: nowIso,
          })
          .eq('id', t.id)
          .eq('next_generation_date', t.next_generation_date)
          .select('id')

        if (claimError) throw claimError
        if (!claimed || claimed.length === 0) {
          results.push({ recurringTaskId: t.id, action: 'skipped: already claimed' })
          continue
        }

        const dueDayEnd = (sastDayIndex(due) + 1) * DAY_MS - SAST_OFFSET_MS - 1

        const { data: newTask, error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: t.title,
            description: t.description,
            project_id: t.project_id,
            assignee_id: t.assignee_id,
            priority: t.priority,
            collaborator_ids: t.collaborator_ids,
            estimated_hours: t.estimated_hours,
            status: t.status || 'todo',
            due_date: new Date(dueDayEnd).toISOString(),
            auth_user_id: t.auth_user_id,
          })
          .select('id')
          .single()

        if (taskError) throw taskError

        results.push({
          recurringTaskId: t.id,
          taskId: newTask.id,
          action: 'created',
          occurrence: new Date(due).toISOString(),
          next: following !== null ? new Date(following).toISOString() : null,
        })
      } catch (error) {
        console.error(`Error processing recurring task ${t.id}:`, error)
        results.push({ recurringTaskId: t.id, action: 'error', error: String(error) })
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
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
