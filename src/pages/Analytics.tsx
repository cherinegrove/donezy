import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, FolderKanban, CheckSquare, AlertTriangle } from "lucide-react";
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
interface ProjectRow {
  project_id: string; project_name: string; status: string; is_final: boolean;
  client_id: string | null; client_name: string | null; owner_name: string | null;
  due_date_parsed: string | null; is_overdue: boolean;
  allocated_hours: number; actual_hours: number; utilization_pct: number | null; remaining_hours: number;
  last_activity: string | null; days_since_activity: number | null; is_stale: boolean;
}
interface TaskRow { dim_id: string | null; dim_label: string | null; task_count: number; final_count: number; completion_rate: number | null; }

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
        <p className="text-muted-foreground">Hours, projects, tasks and risk — across your whole organization.</p>
      </div>

      <Tabs defaultValue="time" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="time"><Clock className="h-4 w-4 mr-1.5" />Time</TabsTrigger>
          <TabsTrigger value="projects"><FolderKanban className="h-4 w-4 mr-1.5" />Projects</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="h-4 w-4 mr-1.5" />Tasks</TabsTrigger>
          <TabsTrigger value="risk"><AlertTriangle className="h-4 w-4 mr-1.5" />Risk</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

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

  const overTime = useRpc<HoursRow>("report_hours", { ...base, p_granularity: granularity, p_group_by: "none" });
  const byUser = useRpc<HoursRow>("report_hours", { ...base, p_granularity: "none", p_group_by: "user" });
  const byProject = useRpc<HoursRow>("report_hours", { ...base, p_granularity: "none", p_group_by: "project" });
  const byClient = useRpc<HoursRow>("report_hours", { ...base, p_granularity: "none", p_group_by: "client" });

  const totalHours = (byUser.data ?? []).reduce((s, r) => s + Number(r.hours), 0);
  const periodFmt = granularity === "year" ? "yyyy" : granularity === "month" ? "MMM yy" : "d MMM";
  const overTimeData = (overTime.data ?? []).map((r) => ({ name: r.period ? format(new Date(r.period), periodFmt) : "", hours: Number(r.hours) }));
  const toBar = (rows?: HoursRow[]) => (rows ?? []).map((r) => ({ name: r.dim_label, hours: Number(r.hours) })).slice(0, 12);

  const periodLabel: Record<TimeFramePreset, string> = {
    today: "today", week: "this week", month: "this month",
    quarter: "this quarter", year: "this year", custom: "the selected range",
  };
  const suffix = ` — ${periodLabel[preset]}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <TimeFrameSelector preset={preset} onPresetChange={setPreset} dateRange={custom} onDateRangeChange={setCustom} />
        <span className="text-xs text-muted-foreground">Applies to every chart on this tab.</span>
      </div>

      <MetricsWidget metrics={[
        { label: "Total Hours", value: totalHours.toLocaleString(undefined, { maximumFractionDigits: 1 }), suffix: "h" },
        { label: "People Logging", value: (byUser.data ?? []).length },
        { label: "Projects With Time", value: (byProject.data ?? []).length },
        { label: "Clients", value: (byClient.data ?? []).length },
      ]} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Hours Over Time</CardTitle>
            {/* Granularity buckets THIS chart only — it doesn't change the totals below. */}
            <Select value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
              <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {overTime.isLoading ? <Loading /> : overTimeData.length === 0 ? <Empty msg="No time logged in this period." /> :
            <ChartWidget type="bar" data={overTimeData} dataKey="hours" nameKey="name" />}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Total Hours by User{suffix}</CardTitle></CardHeader>
          <CardContent>{byUser.isLoading ? <Loading /> : (byUser.data ?? []).length === 0 ? <Empty msg="No data." /> :
            <ChartWidget type="bar" data={toBar(byUser.data)} dataKey="hours" nameKey="name" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Hours by Project{suffix}</CardTitle></CardHeader>
          <CardContent>{byProject.isLoading ? <Loading /> : (byProject.data ?? []).length === 0 ? <Empty msg="No data." /> :
            <ChartWidget type="bar" data={toBar(byProject.data)} dataKey="hours" nameKey="name" />}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Total Hours by Client{suffix}</CardTitle></CardHeader>
        <CardContent>{byClient.isLoading ? <Loading /> : (byClient.data ?? []).length === 0 ? <Empty msg="No data." /> :
          <ChartWidget type="bar" data={toBar(byClient.data)} dataKey="hours" nameKey="name" />}</CardContent>
      </Card>
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
function TasksTab({ statusLabel }: { statusLabel: (v: string | null) => string }) {
  const byStage = useRpc<TaskRow>("report_task_breakdown", { p_group_by: "stage" });
  const byAssignee = useRpc<TaskRow>("report_task_breakdown", { p_group_by: "assignee" });
  const byDue = useRpc<TaskRow>("report_task_breakdown", { p_group_by: "due_bucket" });

  const stageData = (byStage.data ?? []).map((r) => ({ name: statusLabel(r.dim_id), count: Number(r.task_count) }));
  const dueLabels: Record<string, string> = { overdue: "Overdue", today: "Today", this_week: "This Week", later: "Later", none: "No due date" };
  const dueData = (byDue.data ?? []).map((r) => ({ name: dueLabels[r.dim_id ?? "none"] || r.dim_id, count: Number(r.task_count) }));
  const total = (byStage.data ?? []).reduce((s, r) => s + Number(r.task_count), 0);
  const done = (byStage.data ?? []).reduce((s, r) => s + Number(r.final_count), 0);

  return (
    <div className="space-y-6">
      <MetricsWidget metrics={[
        { label: "Total Tasks", value: total },
        { label: "Completed", value: done },
        { label: "Completion Rate", value: total ? Math.round((done / total) * 100) : 0, suffix: "%" },
        { label: "Overdue", value: Number((byDue.data ?? []).find((r) => r.dim_id === "overdue")?.task_count ?? 0) },
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
