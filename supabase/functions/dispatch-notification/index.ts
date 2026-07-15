import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type EventType =
  | "task_assigned"
  | "task_status_changed"
  | "task_updated"
  | "task_commented"
  | "mentioned"

interface DispatchRequest {
  eventType: EventType
  actorId: string
  taskId?: string
  recipientIds?: string[]
  excludeRecipientIds?: string[]
  context: Record<string, string | undefined>
}

const DEFAULTS: Record<EventType, { in_app: boolean; email: boolean }> = {
  task_assigned: { in_app: true, email: true },
  task_status_changed: { in_app: true, email: false },
  task_updated: { in_app: true, email: false },
  task_commented: { in_app: true, email: false },
  mentioned: { in_app: true, email: true },
}

function template(eventType: EventType, ctx: Record<string, string | undefined>): { subject: string; content: string } {
  const taskTitle = ctx.taskTitle || "a task"
  const actorName = ctx.actorName || "Someone"
  const projectName = ctx.projectName ? ` in ${ctx.projectName}` : ""

  switch (eventType) {
    case "task_assigned":
      return {
        subject: `You were assigned: ${taskTitle}`,
        content: `${actorName} assigned you to "${taskTitle}"${projectName}.`,
      }
    case "task_status_changed":
      return {
        subject: `Status changed: ${taskTitle}`,
        content: `${actorName} changed the status of "${taskTitle}"${projectName} from ${ctx.oldStatus || "?"} to ${ctx.newStatus || "?"}.`,
      }
    case "task_updated":
      return {
        subject: `Task updated: ${taskTitle}`,
        content: `${actorName} updated "${taskTitle}"${projectName}.${ctx.changesSummary ? ` Changes: ${ctx.changesSummary}` : ""}`,
      }
    case "task_commented":
      return {
        subject: `New comment: ${taskTitle}`,
        content: `${actorName} commented on "${taskTitle}"${projectName}${ctx.commentPreview ? `: "${ctx.commentPreview}"` : "."}`,
      }
    case "mentioned":
      return {
        subject: `You were mentioned by ${actorName}`,
        content: `${actorName} mentioned you on "${taskTitle}"${projectName}${ctx.commentPreview ? `: "${ctx.commentPreview}"` : "."}`,
      }
  }
}

async function sendEmail(to: string, subject: string, content: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not configured - skipping email send")
    return false
  }

  try {
    const resend = new Resend(resendApiKey)
    const { error } = await resend.emails.send({
      from: "Donezy <noreply@donezy.io>",
      to: [to],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: white; padding: 20px; border-radius: 5px;">
            <div style="color: #333; line-height: 1.6; white-space: pre-line;">
              ${content.replace(/\n/g, "<br>")}
            </div>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error(`Resend error sending to ${to}:`, error)
      return false
    }
    return true
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: DispatchRequest = await req.json()
    const { eventType, actorId, taskId, recipientIds, excludeRecipientIds, context } = body

    if (!eventType || !actorId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Resolve recipients: explicit override, or derive from the task's
    // assignee + collaborators + watchers.
    let recipients = new Set<string>(recipientIds || [])
    if (!recipientIds && taskId) {
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("assignee_id, collaborator_ids, watcher_ids")
        .eq("id", taskId)
        .single()

      if (taskError) {
        console.error("Error fetching task for recipient resolution:", taskError)
      } else if (task) {
        if (task.assignee_id) recipients.add(task.assignee_id)
        for (const id of task.collaborator_ids || []) recipients.add(id)
        for (const id of task.watcher_ids || []) recipients.add(id)
      }
    }

    recipients.delete(actorId)
    for (const id of excludeRecipientIds || []) recipients.delete(id)

    if (recipients.size === 0) {
      return new Response(
        JSON.stringify({ notified: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const recipientList = Array.from(recipients)

    const { data: prefRows, error: prefError } = await supabase
      .from("notification_preferences")
      .select("auth_user_id, in_app, email")
      .in("auth_user_id", recipientList)
      .eq("event_type", eventType)

    if (prefError) {
      console.error("Error fetching notification preferences:", prefError)
    }

    const prefsByUser = new Map<string, { in_app: boolean; email: boolean }>()
    for (const row of prefRows || []) {
      prefsByUser.set(row.auth_user_id, { in_app: row.in_app, email: row.email })
    }

    const { data: recipientUsers, error: usersError } = await supabase
      .from("users")
      .select("auth_user_id, email")
      .in("auth_user_id", recipientList)

    if (usersError) {
      console.error("Error fetching recipient users:", usersError)
    }
    const emailByUser = new Map<string, string>()
    for (const u of recipientUsers || []) {
      if (u.email) emailByUser.set(u.auth_user_id, u.email)
    }

    const { subject, content } = template(eventType, context || {})

    const notified: string[] = []

    for (const recipientId of recipientList) {
      const prefs = prefsByUser.get(recipientId) || DEFAULTS[eventType]

      if (prefs.in_app) {
        const { error: insertError } = await supabase.from("messages").insert({
          from_user_id: actorId,
          to_user_id: recipientId,
          subject,
          content,
          priority: eventType === "mentioned" || eventType === "task_assigned" ? "high" : "normal",
          read: false,
          task_id: taskId || null,
          auth_user_id: actorId,
        })
        if (insertError) {
          console.error(`Error inserting message for ${recipientId}:`, insertError)
        }
      }

      if (prefs.email) {
        const email = emailByUser.get(recipientId)
        if (email) {
          await sendEmail(email, subject, content)
        }
      }

      notified.push(recipientId)
    }

    return new Response(
      JSON.stringify({ notified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error in dispatch-notification function:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
