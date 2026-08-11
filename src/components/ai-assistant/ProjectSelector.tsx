import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project } from "@/types";
import { ChevronRight } from "lucide-react";

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: string | null;
  onProjectSelect: (projectId: string) => void;
  onActionClick: (action: string) => void;
  action: "roundup" | "bottleneck" | "risk" | "prediction" | null;
}

export default function ProjectSelector({
  projects,
  selectedProject,
  onProjectSelect,
  onActionClick,
  action,
}: ProjectSelectorProps) {
  const getActionLabel = () => {
    switch (action) {
      case "roundup":
        return "Get Roundup";
      case "bottleneck":
        return "Find Bottlenecks";
      case "risk":
        return "Analyze Risks";
      case "prediction":
        return "Forecast Completion";
      default:
        return "Select Action";
    }
  };

  const selectedProjectName = projects.find((p) => p.id === selectedProject)?.name;

  return (
    <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
      <p className="text-sm font-semibold">Select Project</p>

      <div className="space-y-2">
        <Select value={selectedProject || ""} onValueChange={onProjectSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a project..." />
          </SelectTrigger>
          <SelectContent>
            {projects.length === 0 ? (
              <SelectItem value="none" disabled>
                No projects found
              </SelectItem>
            ) : (
              projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <span>{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({project.status})
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {selectedProject && (
          <Button
            onClick={() => onActionClick(action || "")}
            disabled={!action || !selectedProject}
            className="w-full gap-2"
          >
            {getActionLabel()}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selectedProjectName && selectedProject && (
        <div className="p-2 bg-white dark:bg-slate-950 rounded border text-sm">
          <p className="font-medium">{selectedProjectName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ready for {action ? getActionLabel().toLowerCase() : "analysis"}
          </p>
        </div>
      )}
    </div>
  );
}
