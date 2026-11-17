import { useMemo, useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDown, ArrowUp, ChevronDown, Columns3, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type ColumnKey =
  | "id"
  | "status"
  | "title"
  | "assignee"
  | "collaborators"
  | "client"
  | "project"
  | "start"
  | "due"
  | "priority"
  | "estimated";

const COLUMNS: { key: ColumnKey; label: string; defaultVisible: boolean }[] = [
  { key: "id", label: "ID", defaultVisible: false },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "title", label: "Task", defaultVisible: true },
  { key: "assignee", label: "Assignee", defaultVisible: true },
  { key: "collaborators", label: "Collaborators", defaultVisible: true },
  { key: "client", label: "Client", defaultVisible: true },
  { key: "project", label: "Project", defaultVisible: true },
  { key: "start", label: "Start", defaultVisible: true },
  { key: "due", label: "Due", defaultVisible: true },
  { key: "priority", label: "Priority", defaultVisible: true },
  { key: "estimated", label: "Est. hours", defaultVisible: true },
];

const COLUMNS_STORAGE_KEY = "donezy.taskTable.columns.v2";
// "normal" exists on older tasks, so it is offered alongside the current levels
const PRIORITY_OPTIONS = ["low", "normal", "medium", "high", "urgent"] as const;
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, normal: 2, low: 3 };

function loadVisibleColumns(): ColumnKey[] {
  const defaults = COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);
  try {
    const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (saved) {
      const { visible, known } = JSON.parse(saved) as { visible: ColumnKey[]; known: ColumnKey[] };
      // Columns added after the choice was saved show with their default setting
      const result = COLUMNS.filter(
        (c) => (visible.includes(c.key) || (c.defaultVisible && !known.includes(c.key)))
      ).map((c) => c.key);
      if (result.length > 0) return result;
    }
  } catch {
    // Unreadable or unavailable storage: fall back to the defaults
  }
  return defaults;
}

interface TableOption {
  value: string;
  label: string;
}

// A plain button that opens a list of options. Uses no native <select>, so the value always shows.
function TableSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: TableOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? (value || "—");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 w-full flex items-center justify-between gap-1 rounded-md border border-input bg-background px-2 text-sm text-left text-foreground hover:bg-muted/40"
        >
          <span className="truncate">{current}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 max-h-72 overflow-y-auto p-1" align="start">
        {options.map((o) => (
          <button
            key={`${o.value}-${o.label}`}
            type="button"
            className={cn(
              "w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted",
              o.value === value && "font-medium"
            )}
            onClick={() => {
              setOpen(false);
              if (o.value !== value) onChange(o.value);
            }}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
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
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify({ visible, known: COLUMNS.map((c) => c.key) }));
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
      case "collaborators":
        return (task.collaboratorIds ?? [])
          .map((id) => userMap.get(id)?.name ?? "")
          .join(", ")
          .toLowerCase();
      case "project":
        return projectMap.get(task.projectId)?.name?.toLowerCase() ?? "";
      case "start":
        return task.startDate ? task.startDate.slice(0, 10) : "9999-12-31";
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
    const inputClass =
      "h-8 w-full rounded-md border border-input bg-background text-foreground px-2 text-sm";
    switch (key) {
      case "id":
        return <span className="font-mono text-xs text-muted-foreground">{task.id.slice(0, 8)}</span>;

      case "status": {
        const options: TableOption[] = statusOptions.map((s) => ({ value: s.value, label: s.label }));
        // Keep statuses the list doesn't define (e.g. "review") visible instead of blank
        if (!options.some((o) => o.value === task.status)) options.push({ value: task.status, label: task.status });
        return (
          <TableSelect
            value={task.status}
            options={options}
            onChange={(value) => commit(task.id, { status: value as Task["status"] })}
          />
        );
      }

      case "title":
        return (
          <input
            key={task.title}
            className={cn(inputClass, "font-medium")}
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

      case "assignee": {
        const options: TableOption[] = [
          { value: "", label: "Unassigned" },
          ...users.map((u) => ({ value: u.id, label: u.name })),
        ];
        if (task.assigneeId && !userMap.has(task.assigneeId)) {
          options.push({ value: task.assigneeId, label: "Unknown user" });
        }
        return (
          <TableSelect
            value={task.assigneeId ?? ""}
            options={options}
            onChange={(value) => commit(task.id, { assigneeId: value || undefined })}
          />
        );
      }

      case "collaborators":
        return (
          <span className="text-sm text-muted-foreground">
            {(task.collaboratorIds ?? []).map((id) => userMap.get(id)?.name ?? "Unknown user").join(", ") || "—"}
          </span>
        );

      case "start":
        return (
          <input
            type="date"
            className={inputClass}
            value={task.startDate ? task.startDate.slice(0, 10) : ""}
            onChange={(e) => commit(task.id, { startDate: (e.target.value || null) as unknown as string })}
          />
        );

      case "client": {
        const currentClientId = clientIdFor(task);
        const options: TableOption[] = clients.map((c) => ({ value: c.id, label: c.name }));
        if (!currentClientId) options.unshift({ value: "", label: "No client" });
        else if (!clientMap.has(currentClientId)) options.push({ value: currentClientId, label: "Client not loaded" });
        return <TableSelect value={currentClientId} options={options} onChange={(value) => changeClient(task, value)} />;
      }

      case "project": {
        const options: TableOption[] = projects.map((p) => ({ value: p.id, label: p.name }));
        if (!projectMap.has(task.projectId)) options.push({ value: task.projectId, label: "Project not loaded" });
        return (
          <TableSelect
            value={task.projectId}
            options={options}
            onChange={(value) => commit(task.id, { projectId: value })}
          />
        );
      }

      case "due":
        return (
          <input
            type="date"
            className={inputClass}
            value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
            onChange={(e) => commit(task.id, { dueDate: (e.target.value || null) as unknown as string })}
          />
        );

      case "priority": {
        const options: TableOption[] = PRIORITY_OPTIONS.map((p) => ({
          value: p,
          label: p.charAt(0).toUpperCase() + p.slice(1),
        }));
        return (
          <TableSelect
            value={task.priority}
            options={options}
            onChange={(value) => commit(task.id, { priority: value as Task["priority"] })}
          />
        );
      }

      case "estimated":
        return (
          <input
            key={task.estimatedHours ?? "none"}
            type="number"
            min="0"
            step="0.5"
            className={inputClass}
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
