import { useState, useEffect, useMemo, useRef } from "react";
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
  BarChart3, MessageSquare, Send, Loader2, Timer, X, ChevronDown, ChevronUp, AtSign
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

interface TeamMember {
  auth_user_id: string;
  name: string;
  email: string;
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
  team_members: TeamMember[] | null;
  portal_id: string;
  project_id: string;
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

// ─── Per-task comment form ────────────────────────────────────────────────────

interface TaskCommentFormProps {
  task: PortalTask;
  portalToken: string;
  teamMembers: TeamMember[];
  clientName: string;
  clientEmail: string;
  onClientNameChange: (v: string) => void;
  onClientEmailChange: (v: string) => void;
}

function TaskCommentForm({
  task,
  portalToken,
  teamMembers,
  clientName,
  clientEmail,
  onClientNameChange,
  onClientEmailChange,
}: TaskCommentFormProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<TeamMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = useMemo(() =>
    teamMembers.filter(m =>
      m.name.toLowerCase().includes(mentionSearch.toLowerCase()) &&
      !mentionedUsers.find(u => u.auth_user_id === m.auth_user_id)
    ), [teamMembers, mentionSearch, mentionedUsers]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    // Detect @ trigger
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setMentionSearch("");
      setShowMentions(true);
    } else if (lastAt !== -1 && val.slice(lastAt + 1).match(/^\w*$/)) {
      setMentionSearch(val.slice(lastAt + 1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    const lastAt = content.lastIndexOf("@");
    const newContent = content.slice(0, lastAt) + `@${member.name} `;
    setContent(newContent);
    setMentionedUsers(prev => [...prev, member]);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const removeMention = (userId: string) => {
    const member = mentionedUsers.find(u => u.auth_user_id === userId);
    if (member) {
      setContent(prev => prev.replace(`@${member.name} `, "").replace(`@${member.name}`, ""));
    }
    setMentionedUsers(prev => prev.filter(u => u.auth_user_id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/portal-add-task-comment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portal_token: portalToken,
            task_id: task.id,
            client_name: clientName.trim(),
            content: content.trim(),
            mentioned_user_ids: mentionedUsers.map(u => u.auth_user_id),
          }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      setContent("");
      setMentionedUsers([]);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      setOpen(false);
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {submitted ? (
            <span className="text-emerald-600 font-medium">Comment sent ✓</span>
          ) : (
            "Leave a comment on this task"
          )}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Comment on: <span className="text-slate-800 truncate max-w-[180px]">{task.title}</span>
            </p>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Name + email (persisted across tasks once filled) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Your name *</Label>
              <Input
                value={clientName}
                onChange={e => onClientNameChange(e.target.value)}
                placeholder="Jane Smith"
                required
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Email (optional)</Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={e => onClientEmailChange(e.target.value)}
                placeholder="jane@company.com"
                className="text-xs h-8"
              />
            </div>
          </div>

          {/* Mention chips */}
          {mentionedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mentionedUsers.map(u => (
                <span key={u.auth_user_id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-[11px] font-medium">
                  @{u.name}
                  <button type="button" onClick={() => removeMention(u.auth_user_id)}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Message textarea with mention dropdown */}
          <div className="relative space-y-1">
            <Label className="text-[11px] text-slate-500">
              Message * <span className="text-slate-400">(type @ to mention a team member)</span>
            </Label>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder="Share feedback or ask a question…"
              rows={3}
              required
              className="text-sm resize-none"
            />
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute z-20 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filteredMembers.map(member => (
                  <button
                    key={member.auth_user_id}
                    type="button"
                    onClick={() => insertMention(member)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-xs">{member.name}</p>
                      <p className="text-slate-400 text-[10px]">{member.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <AtSign className="w-3 h-3" /> Type @ to tag team members
            </p>
            <Button type="submit" disabled={submitting} size="sm" className="h-7 text-xs">
              {submitting ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Sending…</>
              ) : (
                <><Send className="w-3 h-3 mr-1.5" />Send</>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Shared client identity across all task comment forms
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

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

  const taskList = useMemo(() => data?.tasks || [], [data]);
  const teamMembers = useMemo(() => data?.team_members || [], [data]);

  const filteredTasks = useMemo(() => {
    let tasks = taskList;
    if (activeTab !== "all") {
      tasks = tasks.filter(t => t.status === activeTab);
    }
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

  const { project, total_hours, approved_hours, declined_hours, pending_hours } = data;

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

        {/* Tasks Section */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold text-slate-800">Tasks</CardTitle>
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
            {/* Identity reminder banner if name not filled */}
            {!clientName && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-blue-700">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                Want to leave comments? Fill in your name once below a task and it'll be remembered across all tasks.
              </div>
            )}

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
                        <div key={task.id} className="py-3.5">
                          <div className="flex items-start gap-3">
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

                          {/* Per-task comment form */}
                          <div className="ml-7">
                            <TaskCommentForm
                              task={task}
                              portalToken={token!}
                              teamMembers={teamMembers}
                              clientName={clientName}
                              clientEmail={clientEmail}
                              onClientNameChange={setClientName}
                              onClientEmailChange={setClientEmail}
                            />
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

        <p className="text-center text-xs text-slate-400 pb-4">
          Powered by Donezy · This is a read-only project view
        </p>
      </div>
    </div>
  );
}
