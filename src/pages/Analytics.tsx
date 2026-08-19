import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, FolderKanban, CheckSquare, AlertTriangle, TrendingUp, Users, Zap } from "lucide-react";
import { format } from "date-fns";
import {
  startOfToday, startOfWeek, startOfMonth, startOfQuarter, startOfYear,
  endOfToday, endOfWeek, endOfMonth, endOfQuarter, endOfYear,
} from "date-fns";
import { DateRange } from "react-day-picker";
import { ChartWidget } from "@/components/analytics/ChartWidget";
import { MetricsWidget } from "@/components/analytics/MetricsWidget";
import { RiskSuccessWidget } from "@/components/analytics/RiskSuccessWidget";
import { UserFeedbackWidget } from "@/components/analytics/UserFeedbackWidget";
import { TimeFrameSelector, TimeFramePreset } from "@/components/analytics/TimeFrameSelector";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// ---- RPC row shapes -------------------------------------------------------
interface HoursRow { period: string | null; dim_id: string | null; dim_label: string; hours: number; entry_count: number; }
interface HoursRowWithUser extends HoursRow { user_id: string | null; user_name: string | null; }
interface ProjectRow {
  project_id: string; project_name: string; status: string; is_final: boolean;
  client_id: string | null; client_name: string | null; owner_name: string | null;
  due_date_parsed: string | null; is_overdue: boolean;
  allocated_hours: number; actual_hours: number; utilization_pct: number | null; remaining_hours: number;
  last_activity: string | null; days_since_activity: number | null; is_stale: boolean;
}
interface TaskRow { dim_id: string | null; dim_label: string | null; task_count: number; final_count: number; completion_rate: number | null; }
interface TaskCountRow { task_count: number; }

function useRpc<T>(fn: string, args: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: [fn, args],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

function rangeFor(preset: TimeFramePreset, custom?: DateRange): { from: Date; to: Date } {
  if (preset === "custom" && custom?.from && custom?.to) return { from: custom.from, to: custom.to };
  const now = new Date();
  switch (preset) {
    case "today": return { from: startOfToday(), to: endOfToday() };
    case "week": return { from: startOfWeek(now), to: endOfWeek(now) };
    case "quarter": return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case "year": return { from: startOfYear(now), to: endOfYear(now) };
    case "month":
    default: return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

const hours1 = (n: number) => `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 })}h`;

function Loading() {
  return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading report…</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{msg}</div>;
}

// ---------------------------------------------------------------------------
export default function Analytics() {
  const { taskStatuses, projects, tasks, timeEntries, users, clients } = useAppContext();
  const aiData = { projects, tasks, timeEntries, users, clients };
  const statusLabel = (v: string | null) => (v ? taskStatuses.find((s) => s.value === v)?.label || v : "Unknown");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics &amp; Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Hours, projects, tasks and risk — across your whole organization.</p>
      </div>

      <Tabs defaultValue="time" className="space-y-6">
        <div className="flex items-center gap-1 border-b bg-muted/30 rounded-lg p-1">
          <TabsList className="flex-wrap h-auto bg-transparent border-0">
            <TabsTrigger value="time" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><Clock className="h-4 w-4 mr-1.5" />Time</TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><FolderKanban className="h-4 w-4 mr-1.5" />Projects</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><CheckSquare className="h-4 w-4 mr-1.5" />Tasks</TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><AlertTriangle className="h-4 w-4 mr-1.5" />Risk</TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-background data-[state=active]:text-foreground">AI Insights</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="time"><TimeTab /></TabsContent>
        <TabsContent value="projects"><ProjectsTab /></TabsContent>
        <TabsContent value="tasks"><TasksTab statusLabel={statusLabel} /></TabsContent>
        <TabsContent value="risk"><RiskTab /></TabsContent>
        <TabsContent value="insights" className="space-y-6">
          <RiskSuccessWidget data={aiData} />
          <UserFeedbackWidget data={aiData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Time tab -------------------------------------------------------------
function TimeTab() {
  const [preset, setPreset] = useState<TimeFramePreset>("month");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const [granularity, setGranularity] = useState<"day" | "week" | "month" | "year">("day");
  const { from, to } = rangeFor(preset, custom);
  const base = { p_start: from.toISOString(), p_end: to.toISOString(), p_tz: TZ };
  const { timeEntries, tasks, taskStatuses, projects, users, clients } = useAppContext();

  // Fetch hours data grouped by different dimensions
  const overTime = useRpc<HoursRow>("report_hours", { ...base, p_granularity: granularity, p_group_by: "none" });
  const overTimeByUser = useRpc<HoursRow>("report_hours", { ...base, p_granularity: granularity, p_group_by: "user" });

  // Debug RPC calls
  console.log("RPC Query Params:", { ...base, p_granularity: granularity, p_group_by: "user" });
  console.log("overTimeByUser query state:", { isLoading: overTimeByUser.isLoading, isError: overTimeByUser.isError, error: overTimeByUser.error });
  const byUser = useRpc<HoursRow>("report_hours", { ...base, p_granularity: "none", p_group_by: "user" });
  const byProject = useRpc<HoursRow>("report_hours", { ...base, p_granularity: "none", p_group_by: "project" });
  const byClient = useRpc<HoursRow>("report_hours", { ...base, p_granularity: "none", p_group_by: "client" });
  // Reuse byClient instead of making duplicate RPC call
  const allClients = byClient;

  // Calculate metrics
  const userCount = (byUser.data ?? []).length;
  const projectCount = (byProject.data ?? []).reduce((acc, r) => {
    return acc.has(r.dim_id) ? acc : acc.add(r.dim_id);
  }, new Set<string | null>()).size;

  // Client metrics: total clients, active (have time logged), inactive (no time)
  const totalClients = (allClients.data ?? []).length;
  const activeClients = totalClients;  // All clients in the byClient data have time logged

  const periodFmt = granularity === "year" ? "yyyy" : granularity === "month" ? "MMM yy" : "d MMM";
  const overTimeData = (overTime.data ?? []).map((r) => ({ name: r.period ? format(new Date(r.period), periodFmt) : "", hours: Number(r.hours) }));

  // Build stacked data for Hours Over Time by user using the overTimeByUser query
  // which has p_granularity set and p_group_by: "user" to get user-grouped data with time periods
  const overTimeByUserData = (overTimeByUser.data ?? []).map((r) => ({
    period: r.period ? format(new Date(r.period), periodFmt) : "",
    hours: Number(r.hours),
    user: r.dim_label,
  }));

  // Debug logging
  console.log("═══ Hours Over Time (by User) Debug ═══");
  console.log("overTimeByUser.isLoading:", overTimeByUser.isLoading);
  console.log("overTimeByUser.isError:", overTimeByUser.isError);
  console.log("overTimeByUser.error:", overTimeByUser.error);
  console.log("overTimeByUser.data:", overTimeByUser.data);
  console.log("overTimeByUserData.length:", overTimeByUserData.length, "data:", overTimeByUserData);
  console.log("stackedOverTime.length:", stackedOverTime.length, "data:", stackedOverTime);
  console.log("Rendering chart:", stackedOverTime.length > 0 ? "YES - showing chart" : "NO - " + (overTimeByUserData.length === 0 ? "no data" : "stacked empty"));

  // Group by period and stack by user
  const stackedOverTime = Array.from(new Map(
    overTimeByUserData.map(item => [item.period, {}])
  ).entries()).map(([period, _]) => {
    const periodData = overTimeByUserData.filter(item => item.period === period);
    return {
      name: period,
      ...Object.fromEntries(periodData.map(item => [item.user, item.hours]))
    };
  }).filter(item => Object.keys(item).length > 1); // Only keep periods that have user data

  const toBar = (rows?: HoursRow[]) => (rows ?? []).map((r) => ({ name: r.dim_label, hours: Number(r.hours) })).slice(0, 12);

  // PERFORMANCE: Create lookup maps once (O(n)) instead of repeated find() calls (O(n²))
  const lookupMaps = useMemo(() => {
    return {
      taskMap: new Map(tasks.map(t => [t.id, t])),
      projectMap: new Map(projects.map(p => [p.id, p])),
      userMap: new Map(users.map(u => [u.auth_user_id, u])),
      clientMap: new Map(clients.map(c => [c.id, c])),
      statusLabelMap: new Map(taskStatuses.map(s => [s.value, s.label]))
    };
  }, [tasks, projects, users, clients, taskStatuses]);

  // Convert project data to format for display with user breakdown
  const projectDataWithUser = useMemo(() => {
    const projectMap = new Map<string, { project: string; total: number; byUser: Map<string, number> }>();
    const { taskMap, projectMap: pMap, userMap } = lookupMaps;

    // Group time entries by project and user - O(n) instead of O(n*m*p*q)
    timeEntries.forEach(entry => {
      if (!entry.startTime || !entry.endTime) return;
      const entryStart = new Date(entry.startTime);
      if (entryStart >= from && entryStart <= to) {
        const task = taskMap.get(entry.taskId);
        const project = task ? pMap.get(task.projectId) : null;
        if (project) {
          const durationMs = new Date(entry.endTime).getTime() - entryStart.getTime();
          const hours = durationMs / (1000 * 60 * 60);
          const user = userMap.get(entry.userId);
          const userName = user?.name || "Unassigned";

          if (!projectMap.has(project.id)) {
            projectMap.set(project.id, { project: project.name, total: 0, byUser: new Map() });
          }
          const entry_data = projectMap.get(project.id)!;
          entry_data.total += hours;
          entry_data.byUser.set(userName, (entry_data.byUser.get(userName) || 0) + hours);
        }
      }
    });

    return Array.from(projectMap.values());
  }, [timeEntries, lookupMaps, from, to]);

  // Convert client data to format for display with user breakdown
  const clientDataWithUser = useMemo(() => {
    const clientMap = new Map<string, { client: string; total: number; byUser: Map<string, number> }>();
    const { taskMap, projectMap: pMap, userMap, clientMap: cMap } = lookupMaps;

    // Group time entries by client and user - O(n) instead of O(n*m*p*q)
    timeEntries.forEach(entry => {
      if (!entry.startTime || !entry.endTime) return;
      const entryStart = new Date(entry.startTime);
      if (entryStart >= from && entryStart <= to) {
        const task = taskMap.get(entry.taskId);
        const project = task ? pMap.get(task.projectId) : null;
        const client = project?.clientId ? cMap.get(project.clientId) : null;
        if (client) {
          const durationMs = new Date(entry.endTime).getTime() - entryStart.getTime();
          const hours = durationMs / (1000 * 60 * 60);
          const user = userMap.get(entry.userId);
          const userName = user?.name || "Unassigned";

          if (!clientMap.has(client.id)) {
            clientMap.set(client.id, { client: client.name, total: 0, byUser: new Map() });
          }
          const entry_data = clientMap.get(client.id)!;
          entry_data.total += hours;
          entry_data.byUser.set(userName, (entry_data.byUser.get(userName) || 0) + hours);
        }
      }
    });

    return Array.from(clientMap.values());
  }, [timeEntries, lookupMaps, from, to]);

  // Calculate hours by task status from app context
  const statusData = useMemo(() => {
    const statusHours: Record<string, number> = {};
    const { taskMap, statusLabelMap } = lookupMaps;

    // Group time entries by task status - O(n) instead of O(n*m)
    timeEntries.forEach(entry => {
      if (!entry.startTime || !entry.endTime) return;
      const entryStart = new Date(entry.startTime);
      const entryEnd = new Date(entry.endTime);

      // Check if entry falls within date range
      if (entryStart >= from && entryStart <= to) {
        const task = taskMap.get(entry.taskId);
        const status = task?.status || "unknown";
        // Calculate hours from start and end time
        const durationMs = entryEnd.getTime() - entryStart.getTime();
        const hours = durationMs / (1000 * 60 * 60);
        statusHours[status] = (statusHours[status] || 0) + hours;
      }
    });

    // Convert to chart format with labels
    return Object.entries(statusHours).map(([status, hours]) => ({
      name: statusLabelMap.get(status) || status.charAt(0).toUpperCase() + status.slice(1),
      hours: Math.round(hours * 10) / 10
    }));
  }, [timeEntries, lookupMaps, from, to]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border">
        <TimeFrameSelector preset={preset} onPresetChange={setPreset} dateRange={custom} onDateRangeChange={setCustom} />
        <Select value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MetricsWidget metrics={[
        { label: "Team Members", value: userCount, icon: Users },
        { label: "Projects With Time", value: projectCount, icon: FolderKanban },
        { label: "Active Clients", value: activeClients, icon: Zap },
        { label: "Total Clients", value: totalClients, icon: TrendingUp },
      ]} />

      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader className="pb-3 bg-blue-50/50 dark:bg-blue-950/20">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Hours Over Time (by User)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {overTimeByUser.isLoading ? <Loading /> : overTimeByUserData.length === 0 ? <Empty msg="No time logged in this period." /> :
            stackedOverTime.length > 0 ? <ChartWidget type="stacked-bar" data={stackedOverTime} dataKey="hours" nameKey="name" /> :
            <Empty msg="No user breakdown data available." />}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500 shadow-sm">
        <CardHeader className="pb-3 bg-purple-50/50 dark:bg-purple-950/20">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Hours by Task Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">{statusData.length === 0 ? <Empty msg="No time logged in this period." /> :
          <ChartWidget type="bar" data={statusData} dataKey="hours" nameKey="name" />}</CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-3 bg-green-50/50 dark:bg-green-950/20">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <FolderKanban className="h-4 w-4 text-green-600 dark:text-green-400" />
              Hours by Project (by User)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">{projectDataWithUser.length === 0 ? <Empty msg="No data." /> :
            <div className="space-y-6">
            {projectDataWithUser.slice(0, 12).map((entry) => (
              <div key={entry.project}>
                <div className="flex justify-between mb-3">
                  <span className="text-sm font-semibold">{entry.project}</span>
                  <span className="text-sm font-medium text-primary">{hours1(entry.total)}</span>
                </div>
                <div className="space-y-2">
                  {Array.from(entry.byUser.entries())
                    .sort(([, a], [, b]) => b - a)
                    .map(([user, hours]) => {
                      const percentage = entry.total > 0 ? (hours / entry.total) * 100 : 0;
                      return (
                        <div key={user} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium truncate">{user}</span>
                              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{hours1(hours)}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
            }</CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="pb-3 bg-orange-50/50 dark:bg-orange-950/20">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              Hours by Client (by User)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">{clientDataWithUser.length === 0 ? <Empty msg="No data." /> :
            <div className="space-y-6">
              {clientDataWithUser.slice(0, 12).map((entry) => (
                <div key={entry.client}>
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-semibold">{entry.client}</span>
                    <span className="text-sm font-medium text-primary">{hours1(entry.total)}</span>
                  </div>
                  <div className="space-y-2">
                    {Array.from(entry.byUser.entries())
                      .sort(([, a], [, b]) => b - a)
                      .map(([user, hours]) => {
                        const percentage = entry.total > 0 ? (hours / entry.total) * 100 : 0;
                        return (
                          <div key={user} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium truncate">{user}</span>
                                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{hours1(hours)}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          }</CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- Projects tab ---------------------------------------------------------
function ProjectsTab() {
  // Current-state report: all-time actual hours vs total allocation.
  const { data, isLoading } = useRpc<ProjectRow>("report_projects", { p_stale_days: 14 });
  const rows = data ?? [];
  const open = rows.filter((r) => !r.is_final);
  const closed = rows.filter((r) => r.is_final);
  const overdue = rows.filter((r) => r.is_overdue);

  const statusPie = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <MetricsWidget metrics={[
        { label: "Open Projects", value: open.length },
        { label: "Closed Projects", value: closed.length },
        { label: "Overdue", value: overdue.length },
        { label: "Total Projects", value: rows.length },
      ]} />

      <Card>
        <CardHeader><CardTitle>Hours vs Allocation</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <Empty msg="No projects." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Project</th>
                    <th className="py-2 pr-4 font-medium">Client</th>
                    <th className="py-2 pr-4 font-medium text-right">Allocated</th>
                    <th className="py-2 pr-4 font-medium text-right">Actual</th>
                    <th className="py-2 pr-4 font-medium w-[220px]">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {open.slice().sort((a, b) => (b.utilization_pct ?? 0) - (a.utilization_pct ?? 0)).map((r) => {
                    const pct = r.utilization_pct ?? 0;
                    const over = r.allocated_hours > 0 && r.actual_hours > r.allocated_hours;
                    return (
                      <tr key={r.project_id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{r.project_name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{r.client_name || "—"}</td>
                        <td className="py-2 pr-4 text-right">{r.allocated_hours > 0 ? hours1(r.allocated_hours) : "—"}</td>
                        <td className="py-2 pr-4 text-right">{hours1(r.actual_hours)}</td>
                        <td className="py-2 pr-4">
                          {r.allocated_hours > 0 ? (
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(pct, 100)} className={over ? "[&>div]:bg-destructive" : ""} />
                              <span className={`text-xs tabular-nums ${over ? "text-destructive font-medium" : "text-muted-foreground"}`}>{pct}%</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">No allocation</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Project Status</CardTitle></CardHeader>
          <CardContent>{statusPie.length === 0 ? <Empty msg="No data." /> :
            <ChartWidget type="pie" data={statusPie} dataKey="value" nameKey="name" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Overdue Projects ({overdue.length})</CardTitle></CardHeader>
          <CardContent>
            {overdue.length === 0 ? <Empty msg="Nothing overdue. 🎉" /> : (
              <ul className="space-y-2 text-sm">
                {overdue.map((r) => (
                  <li key={r.project_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="font-medium">{r.project_name}</span>
                    <span className="text-destructive text-xs">due {r.due_date_parsed}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- Tasks tab ------------------------------------------------------------
interface OverdueTaskRow { assignee_id: string; assignee_name: string; task_count: number; avg_days_overdue: number; }
interface RescheduleRow { assignee_id?: string; assignee_name?: string; project_id?: string; project_name?: string; client_id?: string; client_name?: string; reschedule_count: number; avg_days_moved: number; }

function TasksTab({ statusLabel }: { statusLabel: (v: string | null) => string }) {
  const [preset, setPreset] = useState<TimeFramePreset>("month");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const { from, to } = rangeFor(preset, custom);
  const base = { p_start: from.toISOString(), p_end: to.toISOString(), p_tz: TZ };

  const byStage = useRpc<TaskRow>("report_task_breakdown", { p_group_by: "stage" });
  const byAssignee = useRpc<TaskRow>("report_task_breakdown", { p_group_by: "assignee" });
  const byDue = useRpc<TaskRow>("report_task_breakdown", { p_group_by: "due_bucket" });
  const tasksCreated = useRpc<TaskCountRow>("report_tasks_created", base);
  const tasksClosed = useRpc<TaskCountRow>("report_tasks_closed", base);
  const overdueByAssignee = useRpc<OverdueTaskRow>("report_overdue_tasks_by_assignee", {});
  const rescheduledByAssignee = useRpc<RescheduleRow>("report_due_date_reschedules_by_assignee", {});
  const rescheduledByProject = useRpc<RescheduleRow>("report_due_date_reschedules_by_project", {});
  const rescheduledByClient = useRpc<RescheduleRow>("report_due_date_reschedules_by_client", {});

  const stageData = (byStage.data ?? []).map((r) => ({ name: statusLabel(r.dim_id), count: Number(r.task_count) }));
  const dueLabels: Record<string, string> = { overdue: "Overdue", today: "Today", this_week: "This Week", later: "Later", none: "No due date" };
  const dueData = (byDue.data ?? []).map((r) => ({ name: dueLabels[r.dim_id ?? "none"] || r.dim_id, count: Number(r.task_count) }));
  const total = (byStage.data ?? []).reduce((s, r) => s + Number(r.task_count), 0);
  const done = (byStage.data ?? []).reduce((s, r) => s + Number(r.final_count), 0);
  const created = (tasksCreated.data ?? []).length > 0 ? (tasksCreated.data?.[0]?.task_count ?? 0) : 0;
  const closed = (tasksClosed.data ?? []).length > 0 ? (tasksClosed.data?.[0]?.task_count ?? 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TimeFrameSelector preset={preset} onPresetChange={setPreset} dateRange={custom} onDateRangeChange={setCustom} />
      </div>

      <MetricsWidget metrics={[
        { label: "Total Tasks Created", value: created },
        { label: "Total Tasks Closed", value: closed },
        { label: "Tasks by Stage", value: total },
        { label: "Completion Rate", value: total ? Math.round((done / total) * 100) : 0, suffix: "%" },
      ]} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tasks by Stage</CardTitle></CardHeader>
          <CardContent>{byStage.isLoading ? <Loading /> : stageData.length === 0 ? <Empty msg="No tasks." /> :
            <ChartWidget type="bar" data={stageData} dataKey="count" nameKey="name" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tasks by Due Date</CardTitle></CardHeader>
          <CardContent>{byDue.isLoading ? <Loading /> : dueData.length === 0 ? <Empty msg="No tasks." /> :
            <ChartWidget type="bar" data={dueData} dataKey="count" nameKey="name" />}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>By Assignee</CardTitle></CardHeader>
        <CardContent>
          {byAssignee.isLoading ? <Loading /> : (byAssignee.data ?? []).length === 0 ? <Empty msg="No tasks." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Assignee</th>
                    <th className="py-2 pr-4 font-medium text-right">Tasks</th>
                    <th className="py-2 pr-4 font-medium text-right">Completed</th>
                    <th className="py-2 pr-4 font-medium text-right">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {(byAssignee.data ?? []).map((r) => (
                    <tr key={r.dim_id ?? "none"} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{r.dim_label || "Unassigned"}</td>
                      <td className="py-2 pr-4 text-right">{r.task_count}</td>
                      <td className="py-2 pr-4 text-right">{r.final_count}</td>
                      <td className="py-2 pr-4 text-right">{r.completion_rate ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500">
        <CardHeader><CardTitle>Overdue Tasks by Assignee</CardTitle></CardHeader>
        <CardContent>
          {overdueByAssignee.isLoading ? <Loading /> : (overdueByAssignee.data ?? []).length === 0 ? <Empty msg="No overdue tasks." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Assignee</th>
                    <th className="py-2 pr-4 font-medium text-right">Overdue Count</th>
                    <th className="py-2 pr-4 font-medium text-right">Avg Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {(overdueByAssignee.data ?? []).map((r) => (
                    <tr key={r.assignee_id ?? "unassigned"} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{r.assignee_name || "Unassigned"}</td>
                      <td className="py-2 pr-4 text-right text-destructive font-semibold">{r.task_count}</td>
                      <td className="py-2 pr-4 text-right text-destructive">{r.avg_days_overdue} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardHeader><CardTitle>Task Push Rate by Assignee</CardTitle></CardHeader>
        <CardContent>
          {rescheduledByAssignee.isLoading ? <Loading /> : (byAssignee.data ?? []).length === 0 ? <Empty msg="No data." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Assignee</th>
                    <th className="py-2 pr-4 font-medium text-right">Total Tasks</th>
                    <th className="py-2 pr-4 font-medium text-right">Due Date Changes</th>
                    <th className="py-2 pr-4 font-medium text-right">Push Rate</th>
                    <th className="py-2 pr-4 font-medium text-right">Avg Days Moved</th>
                  </tr>
                </thead>
                <tbody>
                  {(byAssignee.data ?? []).map((assignee) => {
                    const reschedule = (rescheduledByAssignee.data ?? []).find(r => r.assignee_name === assignee.dim_label);
                    const totalTasks = Number(assignee.task_count) || 0;
                    const changes = reschedule?.reschedule_count ?? 0;
                    const pushRate = totalTasks > 0 ? Math.round((changes / totalTasks) * 100) : 0;
                    const avgDaysMoved = reschedule?.avg_days_moved ?? 0;
                    return (
                      <tr key={assignee.dim_id ?? "none"} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{assignee.dim_label || "Unassigned"}</td>
                        <td className="py-2 pr-4 text-right">{totalTasks}</td>
                        <td className="py-2 pr-4 text-right text-amber-600 dark:text-amber-400 font-semibold">{changes}</td>
                        <td className="py-2 pr-4 text-right">
                          <span className={pushRate > 50 ? "text-red-600 dark:text-red-400 font-semibold" : pushRate > 30 ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}>
                            {pushRate}%
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right text-muted-foreground">{avgDaysMoved > 0 ? `+${avgDaysMoved}d` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader><CardTitle className="text-base">Due Date Changes by Assignee</CardTitle></CardHeader>
          <CardContent>
            {rescheduledByAssignee.isLoading ? <Loading /> : (rescheduledByAssignee.data ?? []).length === 0 ? <Empty msg="No reschedules." /> : (
              <div className="space-y-3">
                {(rescheduledByAssignee.data ?? []).map((r) => (
                  <div key={r.assignee_id ?? "unassigned"} className="flex justify-between items-center pb-3 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.assignee_name || "Unassigned"}</p>
                      <p className="text-xs text-muted-foreground">{r.avg_days_moved}d avg movement</p>
                    </div>
                    <Badge variant="secondary">{r.reschedule_count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader><CardTitle className="text-base">Due Date Changes by Project</CardTitle></CardHeader>
          <CardContent>
            {rescheduledByProject.isLoading ? <Loading /> : (rescheduledByProject.data ?? []).length === 0 ? <Empty msg="No reschedules." /> : (
              <div className="space-y-3">
                {(rescheduledByProject.data ?? []).slice(0, 10).map((r) => (
                  <div key={r.project_id ?? "unknown"} className="flex justify-between items-center pb-3 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium truncate">{r.project_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{r.avg_days_moved}d avg movement</p>
                    </div>
                    <Badge variant="secondary">{r.reschedule_count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader><CardTitle className="text-base">Due Date Changes by Client</CardTitle></CardHeader>
          <CardContent>
            {rescheduledByClient.isLoading ? <Loading /> : (rescheduledByClient.data ?? []).length === 0 ? <Empty msg="No reschedules." /> : (
              <div className="space-y-3">
                {(rescheduledByClient.data ?? []).slice(0, 10).map((r) => (
                  <div key={r.client_id ?? "unknown"} className="flex justify-between items-center pb-3 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium truncate">{r.client_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{r.avg_days_moved}d avg movement</p>
                    </div>
                    <Badge variant="secondary">{r.reschedule_count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- Risk tab -------------------------------------------------------------
function RiskTab() {
  const [staleDays, setStaleDays] = useState(14);
  const { data, isLoading } = useRpc<ProjectRow>("report_projects", { p_stale_days: staleDays });
  const rows = data ?? [];
  const stale = rows.filter((r) => r.is_stale);
  const overdue = rows.filter((r) => r.is_overdue);
  const overAllocated = rows.filter((r) => !r.is_final && r.allocated_hours > 0 && r.actual_hours > r.allocated_hours);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <MetricsWidget metrics={[
        { label: "Stale Projects", value: stale.length },
        { label: "Overdue Projects", value: overdue.length },
        { label: "Over Budget", value: overAllocated.length },
        { label: "Open Projects", value: rows.filter((r) => !r.is_final).length },
      ]} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Stale Open Projects — no activity recently</CardTitle>
            <Select value={String(staleDays)} onValueChange={(v) => setStaleDays(Number(v))}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7+ days</SelectItem>
                <SelectItem value="14">14+ days</SelectItem>
                <SelectItem value="30">30+ days</SelectItem>
                <SelectItem value="60">60+ days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {stale.length === 0 ? <Empty msg={`No open project has been idle ${staleDays}+ days.`} /> : (
            <ul className="space-y-2 text-sm">
              {stale.slice().sort((a, b) => (b.days_since_activity ?? 0) - (a.days_since_activity ?? 0)).map((r) => (
                <li key={r.project_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <span className="font-medium">{r.project_name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{r.client_name || "—"}</span>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">{r.days_since_activity}d idle</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Overdue Projects</CardTitle></CardHeader>
          <CardContent>
            {overdue.length === 0 ? <Empty msg="Nothing overdue." /> : (
              <ul className="space-y-2 text-sm">
                {overdue.map((r) => (
                  <li key={r.project_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="font-medium">{r.project_name}</span>
                    <span className="text-destructive text-xs">due {r.due_date_parsed}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Over Budget (hours)</CardTitle></CardHeader>
          <CardContent>
            {overAllocated.length === 0 ? <Empty msg="No project is over its allocation." /> : (
              <ul className="space-y-2 text-sm">
                {overAllocated.map((r) => (
                  <li key={r.project_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="font-medium">{r.project_name}</span>
                    <span className="text-destructive text-xs">{hours1(r.actual_hours)} / {hours1(r.allocated_hours)} ({r.utilization_pct}%)</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
