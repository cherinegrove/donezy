
import { LayoutGrid, LayoutList, ChartGantt, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ViewMode = "list" | "gantt" | "kanban";

interface ViewSelectorProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewSelector({ currentView, onViewChange }: ViewSelectorProps) {
  return (
    <div className="flex items-center space-x-1 bg-muted/30 rounded-md p-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onViewChange("list")}
            >
              <LayoutList className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>List view</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "gantt" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onViewChange("gantt")}
            >
              <ChartGantt className="h-4 w-4" />
              <span className="sr-only">Gantt view</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Gantt view</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onViewChange("kanban")}
            >
              <Kanban className="h-4 w-4" />
              <span className="sr-only">Kanban view</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kanban view</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
