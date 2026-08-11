import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/types";
import { X } from "lucide-react";

interface TaskStatusFilterProps {
  tasks: Task[];
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
  onClearAll: () => void;
}

export default function TaskStatusFilter({
  tasks,
  selectedStatuses,
  onStatusToggle,
  onClearAll,
}: TaskStatusFilterProps) {
  // Get unique statuses from tasks
  const uniqueStatuses = Array.from(new Set(tasks.map((t) => t.status))).sort();

  // Count tasks per status
  const statusCounts = uniqueStatuses.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100";
      case "in-progress":
        return "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100";
      case "todo":
        return "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100";
      case "blocked":
        return "bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100";
      case "review":
        return "bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100";
      default:
        return "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100";
    }
  };

  const isSelected = (status: string) => selectedStatuses.includes(status);

  return (
    <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Filter by Status</p>
        {selectedStatuses.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {uniqueStatuses.map((status) => (
          <Button
            key={status}
            onClick={() => onStatusToggle(status)}
            variant={isSelected(status) ? "default" : "outline"}
            size="sm"
            className={`capitalize ${isSelected(status) ? getStatusColor(status) : ""}`}
          >
            <span className="text-xs font-medium">{status}</span>
            <Badge
              variant="secondary"
              className={`ml-1.5 px-1.5 py-0 text-xs ${
                isSelected(status) ? "opacity-70" : ""
              }`}
            >
              {statusCounts[status]}
            </Badge>
          </Button>
        ))}
      </div>

      {selectedStatuses.length > 0 && (
        <div className="p-2 bg-white dark:bg-slate-950 rounded border text-sm">
          <p className="font-medium">
            Showing {selectedStatuses.length} status
            {selectedStatuses.length > 1 ? "es" : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {tasks.filter((t) => selectedStatuses.includes(t.status)).length} tasks
          </p>
        </div>
      )}
    </div>
  );
}
