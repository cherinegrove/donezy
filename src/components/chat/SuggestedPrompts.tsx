import { Button } from "@/components/ui/button";

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  hasOverdueTasks: boolean;
  hasTodayTasks: boolean;
}

export function SuggestedPrompts({ onSelectPrompt, hasOverdueTasks, hasTodayTasks }: SuggestedPromptsProps) {
  const prompts = [
    { 
      text: "What's on my plate today?", 
      show: true,
      emoji: "📋"
    },
    { 
      text: "Show me overdue tasks", 
      show: hasOverdueTasks,
      emoji: "⚠️"
    },
    { 
      text: "What tasks are due today?", 
      show: hasTodayTasks,
      emoji: "📅"
    },
    { 
      text: "How do I track time?", 
      show: true,
      emoji: "⏱️"
    },
    { 
      text: "Show my projects", 
      show: true,
      emoji: "📁"
    },
    { 
      text: "Help me prioritize", 
      show: true,
      emoji: "🎯"
    },
  ];

  const visiblePrompts = prompts.filter(p => p.show);

  if (visiblePrompts.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">Suggested questions:</p>
      <div className="flex flex-wrap gap-2">
        {visiblePrompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelectPrompt(prompt.text)}
            className="text-xs h-auto py-1.5 px-3"
          >
            <span className="mr-1">{prompt.emoji}</span>
            {prompt.text}
          </Button>
        ))}
      </div>
    </div>
  );
}
