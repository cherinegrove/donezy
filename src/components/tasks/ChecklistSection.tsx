import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistSectionProps {
  taskId: string;
}

export function ChecklistSection({ taskId }: ChecklistSectionProps) {
  const { tasks, updateTask } = useAppContext();
  const { toast } = useToast();
  const [newItemText, setNewItemText] = useState("");

  const task = tasks.find(t => t.id === taskId);
  const checklist = (task?.checklist || []) as ChecklistItem[];

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      completed: false,
    };

    updateTask(taskId, {
      checklist: [...checklist, newItem],
    });

    setNewItemText("");
    toast({
      title: "Item added",
      description: "Checklist item has been added",
    });
  };

  const handleToggleItem = (itemId: string) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    updateTask(taskId, {
      checklist: updatedChecklist,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedChecklist = checklist.filter(item => item.id !== itemId);

    updateTask(taskId, {
      checklist: updatedChecklist,
    });

    toast({
      title: "Item removed",
      description: "Checklist item has been removed",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddItem();
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {totalCount} completed
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Add New Item */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a checklist item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button onClick={handleAddItem} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklist.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No checklist items yet</p>
            <p className="text-sm">Add items to track your progress</p>
          </div>
        ) : (
          checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors group"
            >
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => handleToggleItem(item.id)}
                className="mt-0.5"
              />
              <span
                className={`flex-1 ${
                  item.completed
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {item.text}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
