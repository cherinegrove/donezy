import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";

export type CardType = 
  | "collaborator-tasks"
  | "time-logs" 
  | "recent-tasks"
  | "notifications"
  | "task-reminders";

interface CardOption {
  id: CardType;
  name: string;
  description: string;
}

const availableCards: CardOption[] = [
  {
    id: "collaborator-tasks",
    name: "Tasks I'm Collaborating On",
    description: "Tasks where I'm a collaborator but not the assignee"
  },
  {
    id: "time-logs",
    name: "My Time This Week",
    description: "Time entries logged this week"
  },
  {
    id: "recent-tasks",
    name: "Tasks Updated This Week",
    description: "Tasks with recent activity"
  },
  {
    id: "notifications",
    name: "Unread Notifications",
    description: "Unread messages and notifications"
  },
  {
    id: "task-reminders",
    name: "Task Reminders Today",
    description: "Tasks due today that need attention"
  }
];

interface CardSelectorProps {
  selectedCards: CardType[];
  onCardToggle: (cardId: CardType) => void;
}

export const CardSelector = ({ selectedCards, onCardToggle }: CardSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Dashboard Cards</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {availableCards.map((card) => (
            <div key={card.id} className="flex items-start space-x-3">
              <Checkbox
                id={card.id}
                checked={selectedCards.includes(card.id)}
                onCheckedChange={() => onCardToggle(card.id)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor={card.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {card.name}
                </label>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};