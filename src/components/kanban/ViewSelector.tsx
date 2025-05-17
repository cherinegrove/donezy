
import { LayoutGrid, LayoutList, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ViewMode = "standard" | "compact" | "detailed";

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
              variant={currentView === "standard" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onViewChange("standard")}
            >
              <Columns className="h-4 w-4" />
              <span className="sr-only">Standard view</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Standard view</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "compact" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onViewChange("compact")}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Compact view</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Compact view</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "detailed" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onViewChange("detailed")}
            >
              <LayoutList className="h-4 w-4" />
              <span className="sr-only">Detailed view</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Detailed view</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
