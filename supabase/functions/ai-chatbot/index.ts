const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const HISTORY_WINDOW = 10

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { message, chatHistory, userContext } = body

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY")
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")

    const activeProjectNames = (userContext?.projects || [])
      .filter((p: any) => p.status === "in-progress")
      .slice(0, 8)
      .map((p: any) => p.name)
      .join(", ") || "(None)"

    // Labels a task with its project and client, e.g. "Title (Project — Client)",
    // so the assistant can always say which project/client a task belongs to
    // instead of just the bare task name.
    const taskLabel = (t: any) => {
      const where = [t.project_name, t.client_name].filter(Boolean).join(" — ")
      return where ? `${t.title} (${where})` : t.title
    }

    // Build system prompt with user data. This is read-only: the assistant
    // answers questions and gives advice, it never creates or modifies data.
    const systemPrompt = `You are a helpful productivity assistant for the Donezy task management app.
You can see the user's tasks, projects, and time tracking below. You are read-only —
you cannot create, edit, or delete anything, so never claim to have done so.

USER STATS:
- Total Tasks: ${userContext?.stats?.totalTasks || 0}
- Completed: ${userContext?.stats?.completedTasks || 0}
- Active Projects: ${userContext?.stats?.activeProjects || 0}
- Hours Logged This Week: ${userContext?.stats?.hoursLoggedThisWeek || 0}
- Active Project Names: ${activeProjectNames}

TASKS DUE TODAY (${userContext?.tasks?.dueToday?.length || 0}):
${userContext?.tasks?.dueToday?.slice(0, 8).map((t: any) => `- [${t.priority}] ${taskLabel(t)}`).join("\n") || "(None)"}

DUE THIS WEEK, NOT TODAY (${userContext?.tasks?.dueThisWeek?.length || 0}):
${userContext?.tasks?.dueThisWeek?.slice(0, 8).map((t: any) => `- [${t.priority}] ${taskLabel(t)} (due ${t.due_date?.split("T")[0]})`).join("\n") || "(None)"}

OVERDUE TASKS (${userContext?.tasks?.overdue?.length || 0}):
${userContext?.tasks?.overdue?.slice(0, 8).map((t: any) => `- ${taskLabel(t)} (was due ${t.due_date?.split("T")[0]})`).join("\n") || "(None)"}

IN PROGRESS (${userContext?.tasks?.inProgress?.length || 0}):
${userContext?.tasks?.inProgress?.slice(0, 8).map((t: any) => `- ${taskLabel(t)}`).join("\n") || "(None)"}

HIGH PRIORITY, NOT DONE (${userContext?.tasks?.urgent?.length || 0}):
${userContext?.tasks?.urgent?.slice(0, 8).map((t: any) => `- ${taskLabel(t)}`).join("\n") || "(None)"}

Be helpful, specific, and reference their actual tasks, projects, and clients by name when
relevant — when you mention a task, include which project/client it belongs to if known.
Give actionable, prioritized advice rather than generic productivity tips.

FORMATTING (the UI only supports this exact plain-text markup, nothing else):
- Use **double asterisks** for bold — bold a short heading/label at the start of a section or a key task name, not whole sentences.
- Use "- " at the start of a line for bullet points when listing multiple tasks/items.
- Do NOT use markdown headings (#), tables, links, or code blocks — they will render as literal text.

LENGTH: Default to a short, scannable answer — a one-line summary plus at most 3-5 bullet points.
Do not dump every matching task. If there's more to say, end with a brief offer like
"Want the full list?" or "Want me to go deeper on any of these?" instead of including everything up front.`

    const recentHistory = (chatHistory || []).slice(-HISTORY_WINDOW)

    // Try Anthropic first
    if (ANTHROPIC_KEY) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...recentHistory.map((m: any) => ({ role: m.role, content: m.content })),
            { role: "user", content: message }
          ]
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("Anthropic error:", error)
        throw new Error(`Anthropic: ${error.error?.message || "Unknown error"}`)
      }

      const data = await response.json()
      const textBlock = Array.isArray(data.content)
        ? data.content.find((block: any) => block.type === "text")
        : undefined
      const responseText = textBlock?.text?.trim()

      if (!responseText) {
        console.error("Anthropic returned no text content:", JSON.stringify(data))
        throw new Error("Anthropic returned an empty response")
      }

      return new Response(
        JSON.stringify({ response: responseText }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // Fall back to OpenAI
    if (OPENAI_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            ...recentHistory.map((m: any) => ({ role: m.role, content: m.content })),
            { role: "user", content: message }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("OpenAI error:", error)
        throw new Error(`OpenAI: ${error.error?.message || "Unknown error"}`)
      }

      const data = await response.json()
      return new Response(
        JSON.stringify({ response: data.choices[0].message.content }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // No provider key configured — fall back to a plain data summary
    return new Response(
      JSON.stringify({
        response: `I can see your tasks but need an AI provider key to give proper advice.

YOUR DATA:
- Total: ${userContext?.stats?.totalTasks || 0} tasks
- Due today: ${userContext?.tasks?.dueToday?.length || 0}
- Overdue: ${userContext?.tasks?.overdue?.length || 0}
- In progress: ${userContext?.tasks?.inProgress?.length || 0}

To enable AI responses, add ANTHROPIC_API_KEY or OPENAI_API_KEY as a Supabase Edge Function secret and redeploy this function.`
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    )

  } catch (e) {
    console.error("ai-chatbot error:", e)
    return new Response(
      JSON.stringify({ response: `Error: ${e.message}` }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
    )
  }
})
