import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, X, Loader2, Bot, User } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SuggestedPrompts } from "./SuggestedPrompts";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Donezy AI assistant. I can help you find tasks, understand your projects, track time, and navigate the platform. What would you like help with?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentUser, projects, tasks, clients, users } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getUserContext = () => {
    // Build context about the user's current state in Donezy
    const userProjects = projects.filter(p => 
      p.ownerId === currentUser?.auth_user_id || 
      p.collaboratorIds?.includes(currentUser?.auth_user_id || "")
    );

    const userTasks = tasks.filter(t => 
      t.assigneeId === currentUser?.auth_user_id ||
      t.collaboratorIds?.includes(currentUser?.auth_user_id || "")
    );

    const overdueTasks = userTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
    );

    const todayTasks = userTasks.filter(t => {
      if (!t.dueDate) return false;
      const today = new Date().toDateString();
      return new Date(t.dueDate).toDateString() === today && t.status !== "done";
    });

    const inProgressTasks = userTasks.filter(t => t.status === "in-progress");

    return {
      user: {
        name: currentUser?.name || "User",
        email: currentUser?.email,
        role: currentUser?.roleId,
      },
      summary: {
        totalProjects: userProjects.length,
        activeProjects: userProjects.filter(p => p.status === "active").length,
        totalTasks: userTasks.length,
        overdueTasks: overdueTasks.length,
        todayTasks: todayTasks.length,
        inProgressTasks: inProgressTasks.length,
      },
      recentProjects: userProjects.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        client: clients.find(c => c.id === p.clientId)?.name,
      })),
      recentTasks: userTasks.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        project: projects.find(p => p.id === t.projectId)?.name,
      })),
      overdueTasks: overdueTasks.map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        project: projects.find(p => p.id === t.projectId)?.name,
      })),
    };
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const context = getUserContext();
      
      // Call Claude API via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("ai-chatbot", {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          context,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
      
      // Add fallback message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Donezy AI Assistant</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}>
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-muted">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          {messages.length <= 1 && (
            <div className="mb-3">
              <SuggestedPrompts
                onSelectPrompt={(prompt) => {
                  setInput(prompt);
                  setTimeout(() => sendMessage(), 100);
                }}
                hasOverdueTasks={getUserContext().summary.overdueTasks > 0}
                hasTodayTasks={getUserContext().summary.todayTasks > 0}
              />
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your tasks..."
              disabled={loading}
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            I can help you find tasks, projects, and navigate Donezy
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
