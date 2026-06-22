import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
      console.log('🎯 sendMessage called with:', text);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      console.log('👤 User:', user.id);

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date(new Date().getTime() - new Date().getDay() * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      // FETCH TASKS
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, estimated_hours, actual_hours, auth_user_id, assignee_id')
        .or(`assignee_id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (tasksError) console.error('❌ Tasks error:', tasksError);
      console.log('✅ Tasks fetched:', tasksData?.length || 0);

      // FETCH PROJECTS
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('auth_user_id', user.id);

      if (projectsError) console.error('❌ Projects error:', projectsError);
      console.log('✅ Projects fetched:', projectsData?.length || 0);

      // FETCH TIME ENTRIES
      const { data: timeEntriesData, error: timeError } = await supabase
        .from('time_entries')
        .select('duration, start_time')
        .eq('auth_user_id', user.id)
        .gte('start_time', weekStart);

      if (timeError) console.error('❌ Time entries error:', timeError);
      console.log('✅ Time entries fetched:', timeEntriesData?.length || 0);

      // Build data
      const allTasks = tasksData || [];
      const allProjects = projectsData || [];
      const allTimeEntries = timeEntriesData || [];

      // Categorize tasks
      const tasksDueToday = allTasks.filter(t => t.due_date?.split('T')[0] === today);
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
          overdue: tasksOverdue,
          inProgress: tasksInProgress,
          urgent: tasksUrgent,
        },
        projects: allProjects,
      };

      console.log('📊 CONTEXT BUILT:', {
        totalTasks: userContext.stats.totalTasks,
        dueToday: userContext.tasks.dueToday.length,
        overdue: userContext.tasks.overdue.length,
      });

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      console.log('🔄 Calling Edge Function...');
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
            chatHistory: messages.slice(-5),
            userContext: userContext,
          }),
        }
      );

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Response received');

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
      console.error("❌ Exception:", error);

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
              Try: "What should I work on today?" or "Show my overdue tasks"
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
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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

      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
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
