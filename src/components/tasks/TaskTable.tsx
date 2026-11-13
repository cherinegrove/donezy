import { useMemo, useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDown, ArrowUp, Columns3, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type ColumnKey = "id" | "status" | "title" | "assignee" | "client" | "project" | "due" | "priority" | "estimated";

const COLUMNS: { key: ColumnKey; label: string; defaultVisible: boolean }[] = [
  { key: "id", label: "ID", defaultVisible: false },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "title", label: "Task", defaultVisible: true },
  { key: "assignee", label: "Assignee", defaultVisible: true },
  { key: "client", label: "Client", defaultVisible: true },
  { key: "project", label: "Project", defaultVisible: false },
  { key: "due", label: "Due", defaultVisible: true },
  { key: "priority", label: "Priority", defaultVisible: true },
  { key: "estimated", label: "Est. hours", defaultVisible: true },
];

const COLUMNS_STORAGE_KEY = "donezy.taskTable.columns";
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const;
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function loadVisibleColumns(): ColumnKey[] {
  try {
    const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ColumnKey[];
      const valid = parsed.filter((key) => COLUMNS.some((c) => c.key === key));
      if (valid.length > 0) return valid;
    }
  } catch {
    // Unreadable or unavailable storage: fall back to the defaults
  }
  return COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);
}

interface TaskTableProps {
  tasks: Task[];
  onTaskOpen?: (taskId: string) => void;
}

// A spreadsheet-style task list. Cells are edited in place and save straight away.
export function TaskTable({ tasks, onTaskOpen }: TaskTableProps) {
  const { users, projects, clients, taskStatuses, updateTask } = useAppContext();
  const { toast } = useToast();
  const [visible, setVisible] = useState<ColumnKey[]>(loadVisibleColumns);
  const [sortKey, setSortKey] = useState<ColumnKey>("due");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visible));
    } catch {
      // Storage unavailable: the choice lasts for this visit only
    }
  }, [visible]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const statusOptions = useMemo(
    () =>
      [...taskStatuses]
        .sort((a, b) => a.order - b.order)
        .filter((s, index, self) => index === self.findIndex((st) => st.value === s.value)),
    [taskStatuses]
  );
  const statusLabel = (value: string) => statusOptions.find((s) => s.value === value)?.label ?? value;

  // Client is not stored on the task: it comes from the task's project
  const clientIdFor = (task: Task) => projectMap.get(task.projectId)?.clientId ?? task.clientId ?? "";
  const clientNameFor = (task: Task) => {
    const clientId = clientIdFor(task);
    return clientMap.get(clientId)?.name ?? "";
  };

  const sortValue = (task: Task, key: ColumnKey): string | number => {
    switch (key) {
      case "id":
        return task.id;
      case "status":
        return statusLabel(task.status);
      case "title":
        return task.title.toLowerCase();
      case "assignee":
        return userMap.get(task.assigneeId ?? "")?.name?.toLowerCase() ?? "";
      case "client":
        return clientNameFor(task).toLowerCase();
      case "project":
        return projectMap.get(task.projectId)?.name?.toLowerCase() ?? "";
      case "due":
        return task.dueDate ? task.dueDate.slice(0, 10) : "9999-12-31";
      case "priority":
        return PRIORITY_RANK[task.priority] ?? 9;
      case "estimated":
        return task.estimatedHours ?? Number.MAX_SAFE_INTEGER;
    }
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const result = av < bv ? -1 : av > bv ? 1 : 0;
      return sortAsc ? result : -result;
    });
    // sortValue reads the lookup maps above; they change with the data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, sortKey, sortAsc, userMap, projectMap, clientMap, statusOptions]);

  const shown = COLUMNS.filter((c) => visible.includes(c.key));

  const toggleSort = (key: ColumnKey) => {
    if (key === sortKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const toggleColumn = (key: ColumnKey, on: boolean) => {
    setVisible((prev) => {
      if (on) return COLUMNS.filter((c) => c.key === key || prev.includes(c.key)).map((c) => c.key);
      return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
    });
  };

  const commit = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
  };

  const changeClient = (task: Task, clientId: string) => {
    const project = projects.find((p) => p.clientId === clientId);
    if (!project) {
      toast({ title: "No projects", description: "This client has no projects yet", variant: "destructive" });
      return;
    }
    if (projectMap.get(task.projectId)?.clientId === clientId) return;
    commit(task.id, { projectId: project.id });
  };

  const renderCell = (task: Task, key: ColumnKey) => {
    const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";
    switch (key) {
      case "id":
        return <span className="font-mono text-xs text-muted-foreground">{task.id.slice(0, 8)}</span>;

      case "status":
        return (
          <select
            className={selectClass}
            value={task.status}
            onChange={(e) => commit(task.id, { status: e.target.value as Task["status"] })}
          >
            {statusOptions.map((s) => (
              <option key={s.id} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        );

      case "title":
        return (
          <input
            key={task.title}
            className={cn(selectClass, "font-medium")}
            defaultValue={task.title}
            onBlur={(e) => {
              const next = e.target.value.trim();
              if (!next) {
                e.target.value = task.title;
                toast({ title: "Title required", description: "The task title cannot be empty", variant: "destructive" });
                return;
              }
              if (next !== task.title) commit(task.id, { title: next });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        );

      case "assignee":
        return (
          <select
            className={selectClass}
            value={task.assigneeId ?? ""}
            onChange={(e) => commit(task.id, { assigneeId: e.target.value || undefined })}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        );

      case "client":
        return (
          <select
            className={selectClass}
            value={clientIdFor(task)}
            onChange={(e) => changeClient(task, e.target.value)}
          >
            {!clientIdFor(task) && <option value="">No client</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        );

      case "project":
        return (
          <select
            className={selectClass}
            value={task.projectId}
            onChange={(e) => commit(task.id, { projectId: e.target.value })}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        );

      case "due":
        return (
          <input
            type="date"
            className={selectClass}
            value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
            onChange={(e) => commit(task.id, { dueDate: (e.target.value || null) as unknown as string })}
          />
        );

      case "priority":
        return (
          <select
            className={selectClass}
            value={task.priority}
            onChange={(e) => commit(task.id, { priority: e.target.value as Task["priority"] })}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        );

      case "estimated":
        return (
          <input
            key={task.estimatedHours ?? "none"}
            type="number"
            min="0"
            step="0.5"
            className={selectClass}
            defaultValue={task.estimatedHours ?? ""}
            onBlur={(e) => {
              const next = e.target.value ? parseFloat(e.target.value) : undefined;
              if (next !== task.estimatedHours) commit(task.id, { estimatedHours: next });
            }}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-1">
              {COLUMNS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                  <Checkbox
                    checked={visible.includes(c.key)}
                    onCheckedChange={(checked) => toggleColumn(c.key, checked === true)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {shown.map((c) => (
                <th key={c.key} className="text-left font-medium px-2 py-2 whitespace-nowrap">
                  <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(c.key)}>
                    {c.label}
                    {sortKey === c.key &&
                      (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr key={task.id} className="border-t hover:bg-muted/30">
                {shown.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 align-middle min-w-[120px]">
                    {renderCell(task, c.key)}
                  </td>
                ))}
                <td className="px-1 text-center">
                  {onTaskOpen && (
                    <button
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={() => onTaskOpen(task.id)}
                      aria-label="Open task"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {sortedTasks.length === 0 && (
              <tr>
                <td colSpan={shown.length + 1} className="text-center py-8 text-muted-foreground">
                  No tasks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
