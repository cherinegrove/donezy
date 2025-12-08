
import { LayoutList, Kanban, GanttChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type BasicViewMode = "list" | "kanban";
type FullViewMode = "list" | "kanban" | "timeline";

// Overload for when timeline is shown
interface ViewSelectorWithTimelineProps {
  currentView: FullViewMode;
  onViewChange: (view: FullViewMode) => void;
  showTimeline: true;
}

// Overload for basic view (no timeline)
interface ViewSelectorBasicProps {
  currentView: BasicViewMode;
  onViewChange: (view: BasicViewMode) => void;
  showTimeline?: false;
}

type ViewSelectorProps = ViewSelectorWithTimelineProps | ViewSelectorBasicProps;

export function ViewSelector(props: ViewSelectorProps) {
  const { currentView, showTimeline } = props;
  
  const handleViewChange = (view: string) => {
    if (showTimeline) {
      (props as ViewSelectorWithTimelineProps).onViewChange(view as FullViewMode);
    } else {
      (props as ViewSelectorBasicProps).onViewChange(view as BasicViewMode);
    }
  };

  return (
    <div className="flex items-center space-x-1 bg-muted/30 rounded-md p-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleViewChange("list")}
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
              variant={currentView === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleViewChange("kanban")}
            >
              <Kanban className="h-4 w-4" />
              <span className="sr-only">Kanban view</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kanban view</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showTimeline && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentView === "timeline" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleViewChange("timeline")}
              >
                <GanttChart className="h-4 w-4" />
                <span className="sr-only">Timeline view</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Timeline view</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
