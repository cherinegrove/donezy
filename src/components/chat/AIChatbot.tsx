import { useState, useEffect, useRef, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: "Overdue", prompt: "What tasks are overdue?" },
  { label: "Due today", prompt: "What's due today?" },
  { label: "This week", prompt: "What's coming up this week?" },
  { label: "Notifications", prompt: "What do I need to pay attention to right now — anything overdue, urgent, or awaiting my action?" },
];

// Renders **bold** and "- "/"* " bullet lists from the assistant's plain-text
// response. Deliberately minimal (not a full markdown parser) since the
// system prompt only ever asks the model for these two constructs.
function renderInline(line: string, keyPrefix: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
    ),
  );
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: { type: "bullets" | "text"; lines: string[] }[] = [];

  for (const line of lines) {
    const isBullet = /^\s*[-*]\s+/.test(line);
    const lastBlock = blocks[blocks.length - 1];
    if (isBullet && lastBlock?.type === "bullets") {
      lastBlock.lines.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (isBullet) {
      blocks.push({ type: "bullets", lines: [line.replace(/^\s*[-*]\s+/, "")] });
    } else if (lastBlock?.type === "text") {
      lastBlock.lines.push(line);
    } else {
      blocks.push({ type: "text", lines: [line] });
    }
  }

  return (
    <div className="text-sm space-y-1.5">
      {blocks.map((block, bi) =>
        block.type === "bullets" ? (
          <ul key={bi} className="list-disc pl-4 space-y-0.5">
            {block.lines.map((l, li) => (
              <li key={li}>{renderInline(l, `${bi}-${li}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={bi} className="whitespace-pre-wrap">
            {block.lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date(new Date().getTime() - new Date().getDay() * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const weekEnd = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      // Which organizations does the user belong to? Needed so the assistant
      // sees shared/org-visible projects, not just ones the user owns directly.
      const { data: orgMemberships } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id);
      const orgIds = (orgMemberships || []).map((o) => o.organization_id);

      // FETCH TASKS — anything the user owns, is assigned to, collaborates on,
      // or watches (not just tasks they created), matching what they'd actually
      // see elsewhere in the app.
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, estimated_hours, actual_hours, auth_user_id, assignee_id, project_id')
        .or(`assignee_id.eq.${user.id},auth_user_id.eq.${user.id},collaborator_ids.cs.{${user.id}},watcher_ids.cs.{${user.id}}`)
        .order('created_at', { ascending: false });

      if (tasksError) console.error('Tasks fetch error:', tasksError);

      // FETCH PROJECTS — owned, collaborated on, watched, or shared via the
      // user's organization membership.
      const projectFilters = [
        `auth_user_id.eq.${user.id}`,
        `collaborator_ids.cs.{${user.id}}`,
        `watcher_ids.cs.{${user.id}}`,
      ];
      if (orgIds.length > 0) {
        projectFilters.push(`organization_id.in.(${orgIds.join(',')})`);
      }
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status, client_id')
        .or(projectFilters.join(','));

      if (projectsError) console.error('Projects fetch error:', projectsError);

      // FETCH CLIENTS — so tasks/projects can be labeled with the client they
      // belong to, not just the project name.
      const clientFilters = [`auth_user_id.eq.${user.id}`];
      if (orgIds.length > 0) {
        clientFilters.push(`organization_id.in.(${orgIds.join(',')})`);
      }
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .or(clientFilters.join(','));

      if (clientsError) console.error('Clients fetch error:', clientsError);

      // FETCH TIME ENTRIES
      const { data: timeEntriesData, error: timeError } = await supabase
        .from('time_entries')
        .select('duration, start_time')
        .eq('auth_user_id', user.id)
        .gte('start_time', weekStart);

      if (timeError) console.error('Time entries fetch error:', timeError);

      // Build data
      const allProjects = projectsData || [];
      const allClients = clientsData || [];
      const allTimeEntries = timeEntriesData || [];

      const projectsById = new Map(allProjects.map((p) => [p.id, p]));
      const clientsById = new Map(allClients.map((c) => [c.id, c.name]));

      // Attach project/client names to each task so the assistant can mention
      // them, not just the bare task title.
      const allTasks = (tasksData || []).map((t) => {
        const project = t.project_id ? projectsById.get(t.project_id) : undefined;
        const clientName = project?.client_id ? clientsById.get(project.client_id) : undefined;
        return {
          ...t,
          project_name: project?.name,
          client_name: clientName,
        };
      });

      // Categorize tasks
      const tasksDueToday = allTasks.filter(t => t.due_date?.split('T')[0] === today);
      const tasksDueThisWeek = allTasks.filter(t => {
        const d = t.due_date?.split('T')[0];
        return d && d > today && d <= weekEnd && t.status !== 'done';
      });
      const tasksOverdue = allTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done');
      const tasksInProgress = allTasks.filter(t => t.status === 'in-progress');
      const tasksUrgent = allTasks.filter(t => t.priority === 'high' && t.status !== 'done');

      const hoursThisWeek = Math.round(
        allTimeEntries.reduce((sum, te) => sum + (te.duration || 0), 0) / 60
      );

      // Build context
      const userContext = {
        userId: user.id,
        userName: profileData?.full_name || 'User',
        userEmail: profileData?.email || user.email,
        stats: {
          totalTasks: allTasks.length,
          completedTasks: allTasks.filter(t => t.status === 'done').length,
          activeProjects: allProjects.filter(p => p.status === 'in-progress').length,
          hoursLoggedThisWeek: hoursThisWeek,
        },
        tasks: {
          all: allTasks,
          dueToday: tasksDueToday,
          dueThisWeek: tasksDueThisWeek,
          overdue: tasksOverdue,
          inProgress: tasksInProgress,
          urgent: tasksUrgent,
        },
        projects: allProjects,
      };

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        'https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/ai-chatbot',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: text,
            chatHistory: messages.slice(-10),
            userContext: userContext,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ai-chatbot response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data || !data.response) {
        throw new Error('No response from chatbot');
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("AIChatbot sendMessage error:", error);

      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });

      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform flex items-center justify-center z-50"
      >
        <span className="text-2xl">💬</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-background border border-border rounded-lg shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-semibold text-sm">Donezy Assistant</h3>
            <p className="text-xs text-muted-foreground">Your productivity helper</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground hover:text-foreground w-6 h-6 flex items-center justify-center rounded hover:bg-muted"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-3xl">👋</p>
            <p className="text-sm text-muted-foreground mb-2">Ask about your tasks!</p>
            <p className="text-xs text-muted-foreground">
              Try a quick question below, or type your own.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {message.role === "assistant" ? (
                <FormattedMessage content={message.content} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              <p className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pt-3 flex flex-wrap gap-1.5 border-t border-border">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.label}
            type="button"
            disabled={isLoading}
            onClick={() => sendMessage(qp.prompt)}
            className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted disabled:opacity-50 text-foreground"
          >
            {qp.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me..."
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
