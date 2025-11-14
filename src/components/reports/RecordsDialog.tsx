import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Task, Project, TimeEntry } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface RecordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  records: Task[] | Project[] | TimeEntry[];
  type: "tasks" | "projects" | "timeEntries";
}

export function RecordsDialog({
  open,
  onOpenChange,
  title,
  description,
  records,
  type,
}: RecordsDialogProps) {
  const navigate = useNavigate();

  const handleRecordClick = (record: Task | Project | TimeEntry) => {
    if (type === "tasks") {
      navigate(`/tasks/${record.id}`);
    } else if (type === "projects") {
      navigate(`/projects/${record.id}`);
    }
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      backlog: "bg-gray-500",
      todo: "bg-blue-500",
      "in-progress": "bg-yellow-500",
      review: "bg-purple-500",
      done: "bg-green-500",
      "on-hold": "bg-orange-500",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-2">
            {records.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No records found</p>
            ) : type === "tasks" ? (
              (records as Task[]).map((task) => (
                <Button
                  key={task.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4 hover:bg-accent"
                  onClick={() => handleRecordClick(task)}
                >
                  <div className="flex flex-col items-start gap-2 w-full">
                    <div className="flex items-center gap-2 w-full">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      <span className="font-semibold">{task.title}</span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {task.dueDate && (
                        <span>
                          Due: {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </span>
                      )}
                      {task.priority && (
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Button>
              ))
            ) : type === "projects" ? (
              (records as Project[]).map((project) => (
                <Button
                  key={project.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4 hover:bg-accent"
                  onClick={() => handleRecordClick(project)}
                >
                  <div className="flex flex-col items-start gap-2 w-full">
                    <div className="flex items-center gap-2 w-full">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <span className="font-semibold">{project.name}</span>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </Button>
              ))
            ) : (
              (records as TimeEntry[]).map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 hover:bg-accent"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{entry.description || "Time Entry"}</span>
                      <Badge>{((entry.duration || 0) / 60).toFixed(2)}h</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.startTime).toLocaleString()}
                      {entry.status && (
                        <Badge variant="outline" className="ml-2">
                          {entry.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
