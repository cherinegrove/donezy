import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Clock, AlertCircle, Calendar as CalendarIcon,
  BarChart3, MessageSquare, Send, Loader2, Timer, X
} from "lucide-react";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

interface PortalTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_hours: number | null;
  created_at: string;
  time_spent_hours: number;
}

interface PortalComment {
  id: string;
  client_name: string;
  content: string;
  created_at: string;
}

interface PortalProject {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  service_type: string;
  allocated_hours: number | null;
  used_hours: number | null;
}

interface PortalData {
  project: PortalProject;
  tasks: PortalTask[] | null;
  total_hours: number;
  approved_hours: number;
  declined_hours: number;
  pending_hours: number;
  comments: PortalComment[] | null;
  portal_id: string;
  error?: string;
}

const STATUS_TABS = [
  { value: "all", label: "All Tasks" },
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "awaiting-feedback", label: "Awaiting Feedback" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "backlog", label: "Backlog" },
];

const statusColors: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  review: "bg-amber-100 text-amber-700 border-amber-200",
  "awaiting-feedback": "bg-purple-100 text-purple-700 border-purple-200",
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  backlog: "bg-gray-100 text-gray-600 border-gray-200",
};

const priorityColors: Record<string, string> = {
  urgent: "text-red-600",
  high: "text-orange-500",
  medium: "text-amber-500",
  low: "text-slate-400",
};

const statusIcon = (status: string) => {
  if (status === "done") return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
  if (status === "in-progress") return <Clock className="w-4 h-4 text-blue-500 shrink-0" />;
  return <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />;
};

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Comment form
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadPortalData();
  }, [token]);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const { data: result, error: fnError } = await supabase.rpc("get_portal_data", {
        portal_token: token,
      });
      if (fnError) throw fnError;
      const portalData = result as unknown as PortalData;
      if (portalData?.error) {
        setError(portalData.error);
      } else {
        setData(portalData);
      }
    } catch {
      setError("Unable to load portal. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.portal_id || !clientName.trim() || !commentContent.trim()) return;
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("portal_comments")
        .insert({
          portal_id: data.portal_id,
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || null,
          content: commentContent.trim(),
        });
      if (insertError) throw insertError;
      setCommentContent("");
      await loadPortalData();
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const taskList = useMemo(() => data?.tasks || [], [data]);

  const filteredTasks = useMemo(() => {
    let tasks = taskList;

    // Filter by status tab
    if (activeTab !== "all") {
      tasks = tasks.filter(t => t.status === activeTab);
    }

    // Filter by date range (due_date)
    if (dateRange?.from) {
      tasks = tasks.filter(t => {
        if (!t.due_date) return false;
        const due = parseISO(t.due_date);
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return isWithinInterval(due, { start: from, end: to });
      });
    }

    return tasks;
  }, [taskList, activeTab, dateRange]);

  // Count per status for tab badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: taskList.length };
    taskList.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [taskList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading project portal…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-lg">
          <CardContent className="pt-10 pb-10 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Portal Not Found</h2>
            <p className="text-slate-500 text-sm">
              {error || "This portal link is invalid or has been deactivated."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, total_hours, approved_hours, declined_hours, pending_hours, comments } = data;
  const commentList = comments || [];

  const doneTasks = taskList.filter(t => t.status === "done").length;
  const inProgressTasks = taskList.filter(t => t.status === "in-progress").length;
  const progress = taskList.length > 0 ? Math.round((doneTasks / taskList.length) * 100) : 0;
  const hoursPercent =
    project.allocated_hours && project.allocated_hours > 0
      ? Math.min(Math.round((total_hours / project.allocated_hours) * 100), 100)
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-1">Project Portal</p>
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              {project.description && (
                <p className="text-slate-500 mt-1 text-sm max-w-xl">{project.description}</p>
              )}
            </div>
            <Badge className={`capitalize shrink-0 border ${statusColors[project.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
              {project.status?.replace(/-/g, " ")}
            </Badge>
          </div>
          {(project.start_date || project.due_date) && (
            <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
              <CalendarIcon className="w-4 h-4" />
              {project.start_date && <span>Start: {project.start_date}</span>}
              {project.start_date && project.due_date && <span>→</span>}
              {project.due_date && <span>Due: {project.due_date}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-500">Overall Progress</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{progress}%</p>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{doneTasks} of {taskList.length} tasks complete</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 sm:col-span-2">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-500">Time Tracked</p>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{total_hours.toFixed(1)}h</p>
              {hoursPercent !== null && (
                <>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${hoursPercent >= 90 ? "bg-red-400" : hoursPercent >= 75 ? "bg-amber-400" : "bg-blue-500"}`}
                      style={{ width: `${hoursPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{hoursPercent}% of {project.allocated_hours}h budget</p>
                </>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Approved</p>
                  <p className="text-sm font-semibold text-emerald-600">{(approved_hours ?? 0).toFixed(1)}h</p>
                </div>
                <div className="text-center border-x border-slate-100">
                  <p className="text-xs text-slate-400 mb-0.5">Pending</p>
                  <p className="text-sm font-semibold text-amber-500">{(pending_hours ?? 0).toFixed(1)}h</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Declined</p>
                  <p className="text-sm font-semibold text-red-500">{(declined_hours ?? 0).toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-500">Active Tasks</p>
                <BarChart3 className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{inProgressTasks}</p>
              <p className="text-xs text-slate-400 mt-1">{taskList.length - doneTasks} remaining in total</p>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Section with Tabs + Date Filter */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold text-slate-800">Tasks</CardTitle>
              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "text-xs gap-1.5 h-8",
                        dateRange?.from && "border-blue-300 bg-blue-50 text-blue-700"
                      )}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {dateRange?.from ? (
                        dateRange.to
                          ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
                          : format(dateRange.from, "MMM d, yyyy")
                      ) : "Filter by due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {dateRange?.from && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                    onClick={() => setDateRange(undefined)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto gap-1 bg-slate-100 p-1 mb-4">
                {STATUS_TABS.map(tab => {
                  const count = statusCounts[tab.value] ?? 0;
                  if (tab.value !== "all" && count === 0) return null;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="text-xs gap-1.5 data-[state=active]:bg-white"
                    >
                      {tab.label}
                      <span className="bg-slate-200 data-[state=active]:bg-slate-100 text-slate-600 rounded-full px-1.5 py-0 text-[10px] font-medium">
                        {count}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {STATUS_TABS.map(tab => (
                <TabsContent key={tab.value} value={tab.value} className="mt-0">
                  {filteredTasks.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-8">
                      {dateRange?.from ? "No tasks match the selected date range." : "No tasks in this category."}
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredTasks.map(task => (
                        <div key={task.id} className="flex items-start gap-3 py-3.5">
                          <div className="mt-0.5">{statusIcon(task.status)}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              {task.due_date && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <CalendarIcon className="w-3 h-3" />
                                  Due {task.due_date}
                                </span>
                              )}
                              {task.time_spent_hours > 0 && (
                                <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                                  <Timer className="w-3 h-3" />
                                  {task.time_spent_hours.toFixed(1)}h logged
                                </span>
                              )}
                              {task.estimated_hours ? (
                                <span className="text-xs text-slate-400">
                                  est. {task.estimated_hours}h
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 pt-0.5">
                            <span className={`text-xs font-medium capitalize ${priorityColors[task.priority] || "text-slate-400"}`}>
                              {task.priority}
                            </span>
                            <Badge className={`text-xs capitalize border ${statusColors[task.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {task.status?.replace(/-/g, " ")}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Leave a Comment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="client-name" className="text-xs text-slate-600">Your name *</Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="client-email" className="text-xs text-slate-600">Email (optional)</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="comment" className="text-xs text-slate-600">Message *</Label>
                <Textarea
                  id="comment"
                  value={commentContent}
                  onChange={e => setCommentContent(e.target.value)}
                  placeholder="Share feedback, ask questions, or leave a note…"
                  rows={3}
                  required
                  className="text-sm resize-none"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto" size="sm">
                {submitting ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="w-3.5 h-3.5 mr-2" /> Send Comment</>
                )}
              </Button>
            </form>

            {commentList.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Previous Comments</p>
                  {commentList.map(c => (
                    <div key={c.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-slate-800">{c.client_name}</p>
                        <p className="text-xs text-slate-400">{format(new Date(c.created_at), "MMM d, yyyy")}</p>
                      </div>
                      <p className="text-sm text-slate-600">{c.content}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 pb-4">
          Powered by Donezy · This is a read-only project view
        </p>
      </div>
    </div>
  );
}
