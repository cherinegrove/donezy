const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const HISTORY_WINDOW = 10

// The one mutating tool the assistant can use. Using it only PROPOSES a task —
// the frontend renders a confirm card and nothing is written until the user
// clicks Confirm, where creation goes through the app's normal addTask() path.
const CREATE_TASK_TOOL = {
  name: "create_task",
  description:
    "Propose a new task for the user to confirm. This does NOT create the task — the user " +
    "sees a confirmation card and must approve it first, so never claim the task exists. " +
    "projectName is required and must EXACTLY match one of the project names listed in the " +
    "system prompt; if the user hasn't said which project, ask them in plain text instead of " +
    "using this tool. assigneeName, if given, must exactly match a listed team member name.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short task title" },
      projectName: {
        type: "string",
        description: "Exact name of one of the user's projects (from the system prompt list)",
      },
      description: { type: "string", description: "Longer task description, if the user gave detail" },
      assigneeName: {
        type: "string",
        description: "Exact name of a team member (from the system prompt list) to assign the task to",
      },
      dueDate: {
        type: "string",
        description: "Due date as YYYY-MM-DD, computed from today's date given in the system prompt",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
        description: "Task priority; omit for medium",
      },
    },
    required: ["title", "projectName"],
  },
}

// Exact, case-insensitive name match against a server-supplied list.
// Returns the single match, or null plus the reason (not-found vs ambiguous).
function resolveName<T extends { name: string }>(
  name: string,
  list: T[],
): { match: T | null; ambiguous: boolean } {
  const lower = name.trim().toLowerCase()
  const matches = list.filter((item) => (item.name || "").trim().toLowerCase() === lower)
  if (matches.length === 1) return { match: matches[0], ambiguous: false }
  return { match: null, ambiguous: matches.length > 1 }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { message, chatHistory, userContext, teamMembers } = body

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY")
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")

    const allProjects: { id: string; name: string; status?: string }[] =
      userContext?.projects || []
    const allTeamMembers: { id: string; name: string }[] = teamMembers || []

    const activeProjectNames = allProjects
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

    // Server-computed date facts so relative phrases ("by Friday") resolve
    // correctly without trusting the client's clock.
    const now = new Date()
    const todayIso = now.toISOString().split("T")[0]
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
      now.getUTCDay()
    ]

    const projectNameList = allProjects.map((p) => p.name).filter(Boolean)
    const memberNameList = allTeamMembers.map((m) => m.name).filter(Boolean)

    const systemPrompt = `You are a helpful productivity assistant for the Donezy task management app.
You can see the user's tasks, projects, and time tracking below.

TODAY'S DATE: ${todayIso} (${weekday}). Use this to compute absolute dates from relative phrases like "Friday" or "next week".

You can PROPOSE new tasks with the create_task tool. Using the tool does NOT create the task —
the user sees a confirmation card and must click Confirm first. Never say a task has been
created; say it's ready for their confirmation. You cannot edit or delete anything.

CREATE_TASK RULES:
- projectName is required and must EXACTLY match one of these project names: ${projectNameList.length > 0 ? projectNameList.join(" | ") : "(none — the user has no projects, so tasks cannot be created; tell them plainly to create a project first)"}
- If the user didn't say which project, ask them which project in plain text — do not guess and do not use the tool.
- assigneeName, if used, must EXACTLY match one of these team members: ${memberNameList.length > 0 ? memberNameList.join(" | ") : "(none)"}
- If a name the user gave doesn't match the lists, ask for clarification in plain text instead of using the tool.

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
          tools: [CREATE_TASK_TOOL],
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
      const blocks: any[] = Array.isArray(data.content) ? data.content : []
      const textBlock = blocks.find((block) => block.type === "text")
      const toolBlock = blocks.find(
        (block) => block.type === "tool_use" && block.name === "create_task",
      )
      const responseText = textBlock?.text?.trim()

      if (toolBlock) {
        const input = toolBlock.input || {}
        const title = (input.title || "").trim()
        const projectName = (input.projectName || "").trim()

        if (!title || !projectName) {
          return new Response(
            JSON.stringify({
              response:
                responseText ||
                "I need at least a task title and a project to set that up — which project should this go under?",
            }),
            { headers: { "Content-Type": "application/json", ...corsHeaders } },
          )
        }

        const projectResult = resolveName(projectName, allProjects)
        if (!projectResult.match) {
          const suggestion = projectNameList.slice(0, 5).join(", ")
          return new Response(
            JSON.stringify({
              response: projectResult.ambiguous
                ? `You have more than one project called "${projectName}" — I can't safely pick one. Could you be more specific?`
                : `I couldn't find a project called "${projectName}".${suggestion ? ` Your projects include: ${suggestion}.` : ""} Which one did you mean?`,
            }),
            { headers: { "Content-Type": "application/json", ...corsHeaders } },
          )
        }

        let assigneeId: string | undefined
        let assigneeName: string | undefined
        if (input.assigneeName) {
          const memberResult = resolveName(input.assigneeName, allTeamMembers)
          if (!memberResult.match) {
            const suggestion = memberNameList.slice(0, 8).join(", ")
            return new Response(
              JSON.stringify({
                response: memberResult.ambiguous
                  ? `More than one team member is called "${input.assigneeName}" — who exactly did you mean?`
                  : `I couldn't find a team member called "${input.assigneeName}".${suggestion ? ` Your team: ${suggestion}.` : ""} Who did you mean?`,
              }),
              { headers: { "Content-Type": "application/json", ...corsHeaders } },
            )
          }
          assigneeId = memberResult.match.id
          assigneeName = memberResult.match.name
        }

        const priority = ["low", "medium", "high", "urgent"].includes(input.priority)
          ? input.priority
          : undefined
        const dueDate =
          typeof input.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)
            ? input.dueDate
            : undefined

        return new Response(
          JSON.stringify({
            response: responseText || "Here's the task I'll create — please confirm:",
            proposedAction: {
              type: "create_task",
              title,
              description: (input.description || "").trim() || undefined,
              projectId: projectResult.match.id,
              projectName: projectResult.match.name,
              assigneeId,
              assigneeName,
              dueDate,
              priority,
            },
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } },
        )
      }

      if (!responseText) {
        console.error("Anthropic returned no text content:", JSON.stringify(data))
        throw new Error("Anthropic returned an empty response")
      }

      return new Response(
        JSON.stringify({ response: responseText }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // Fall back to OpenAI (text-only — no task-creation tool on this path)
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
