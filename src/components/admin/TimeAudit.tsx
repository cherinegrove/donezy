import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertTriangle, Clock, Play, Search, Download } from "lucide-react";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";

interface RawTimeEntry {
  id: string;
  user_id: string;
  task_id: string | null;
  project_id: string | null;
  client_id: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  notes: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export const TimeAudit = () => {
  const { users, projects, tasks, clients } = useAppContext();
  const [entries, setEntries] = useState<RawTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching time entries:', error);
        return;
      }

      setEntries(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId || u.auth_user_id === userId);
    return user?.name || userId;
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "-";
    const project = projects.find(p => p.id === projectId);
    return project?.name || projectId;
  };

  const getTaskName = (taskId: string | null) => {
    if (!taskId) return "-";
    const task = tasks.find(t => t.id === taskId);
    return task?.title || taskId;
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "-";
    const client = clients.find(c => c.id === clientId);
    return client?.name || clientId;
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateLiveDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return formatDuration(diffMins);
  };

  // Filter entries
  const activeTimers = entries.filter(e => !e.end_time);
  const suspiciousEntries = entries.filter(e => {
    // Entries without duration but with end_time
    if (e.end_time && (e.duration === null || e.duration === 0)) return true;
    // Entries running for more than 12 hours
    if (!e.end_time) {
      const hours = differenceInHours(new Date(), new Date(e.start_time));
      if (hours > 12) return true;
    }
    // Entries with very high duration (>24 hours)
    if (e.duration && e.duration > 24 * 60) return true;
    return false;
  });

  const filteredEntries = entries.filter(entry => {
    // Tab filter
    if (activeTab === "active" && entry.end_time) return false;
    if (activeTab === "suspicious" && !suspiciousEntries.includes(entry)) return false;

    // User filter
    if (userFilter !== "all" && entry.user_id !== userFilter) return false;

    // Status filter
    if (statusFilter !== "all" && entry.status !== statusFilter) return false;

    // Search filter
    if (searchTerm) {
      const userName = getUserName(entry.user_id).toLowerCase();
      const projectName = getProjectName(entry.project_id).toLowerCase();
      const taskName = getTaskName(entry.task_id).toLowerCase();
      const notes = (entry.notes || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      
      if (!userName.includes(search) && 
          !projectName.includes(search) && 
          !taskName.includes(search) &&
          !notes.includes(search)) {
        return false;
      }
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = ["ID", "User", "Project", "Task", "Client", "Start Time", "End Time", "Duration (min)", "Status", "Notes"];
    const rows = filteredEntries.map(e => [
      e.id,
      getUserName(e.user_id),
      getProjectName(e.project_id),
      getTaskName(e.task_id),
      getClientName(e.client_id),
      e.start_time,
      e.end_time || "ACTIVE",
      e.duration?.toString() || "",
      e.status || "",
      (e.notes || "").replace(/,/g, ";")
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-audit-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
  };

  const getStatusBadge = (entry: RawTimeEntry) => {
    if (!entry.end_time) {
      const hours = differenceInHours(new Date(), new Date(entry.start_time));
      if (hours > 12) {
        return <Badge variant="destructive" className="animate-pulse">Active {hours}h+ ⚠️</Badge>;
      }
      return <Badge className="bg-green-500 animate-pulse">Active</Badge>;
    }
    
    if (entry.status === "approved") {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
    }
    if (entry.status === "declined") {
      return <Badge variant="destructive">Declined</Badge>;
    }
    return <Badge variant="secondary">{entry.status || "Pending"}</Badge>;
  };

  // Get unique users from entries
  const uniqueUserIds = [...new Set(entries.map(e => e.user_id))];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Time Entry Audit
              </CardTitle>
              <CardDescription>View all raw time entry data from the database</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Entries</p>
                    <p className="text-2xl font-bold">{entries.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground/20" />
                </div>
              </CardContent>
            </Card>
            <Card className={activeTimers.length > 0 ? "border-green-500/50" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Timers</p>
                    <p className="text-2xl font-bold text-green-600">{activeTimers.length}</p>
                  </div>
                  <Play className="h-8 w-8 text-green-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className={suspiciousEntries.length > 0 ? "border-amber-500/50" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Suspicious</p>
                    <p className="text-2xl font-bold text-amber-600">{suspiciousEntries.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Users</p>
                    <p className="text-2xl font-bold">{uniqueUserIds.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Entries ({entries.length})</TabsTrigger>
              <TabsTrigger value="active" className="text-green-600">
                Active ({activeTimers.length})
              </TabsTrigger>
              <TabsTrigger value="suspicious" className="text-amber-600">
                Suspicious ({suspiciousEntries.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, project, task, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUserIds.map(userId => (
                    <SelectItem key={userId} value={userId}>
                      {getUserName(userId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="all" className="mt-4">
              <TimeEntryTable entries={filteredEntries} {...{ getUserName, getProjectName, getTaskName, getClientName, formatDuration, calculateLiveDuration, getStatusBadge }} />
            </TabsContent>
            <TabsContent value="active" className="mt-4">
              <TimeEntryTable entries={filteredEntries} {...{ getUserName, getProjectName, getTaskName, getClientName, formatDuration, calculateLiveDuration, getStatusBadge }} />
            </TabsContent>
            <TabsContent value="suspicious" className="mt-4">
              <TimeEntryTable entries={filteredEntries} {...{ getUserName, getProjectName, getTaskName, getClientName, formatDuration, calculateLiveDuration, getStatusBadge }} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface TimeEntryTableProps {
  entries: RawTimeEntry[];
  getUserName: (id: string) => string;
  getProjectName: (id: string | null) => string;
  getTaskName: (id: string | null) => string;
  getClientName: (id: string | null) => string;
  formatDuration: (mins: number | null) => string;
  calculateLiveDuration: (startTime: string) => string;
  getStatusBadge: (entry: RawTimeEntry) => JSX.Element;
}

const TimeEntryTable = ({ 
  entries, 
  getUserName, 
  getProjectName, 
  getTaskName, 
  getClientName,
  formatDuration,
  calculateLiveDuration,
  getStatusBadge 
}: TimeEntryTableProps) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No entries found matching your filters
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto max-h-[600px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-[80px]">Status</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-[100px]">Entry ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} className={!entry.end_time ? "bg-green-500/5" : ""}>
              <TableCell>{getStatusBadge(entry)}</TableCell>
              <TableCell className="font-medium">{getUserName(entry.user_id)}</TableCell>
              <TableCell>{getClientName(entry.client_id)}</TableCell>
              <TableCell>{getProjectName(entry.project_id)}</TableCell>
              <TableCell className="max-w-[200px] truncate">{getTaskName(entry.task_id)}</TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(new Date(entry.start_time), 'MMM d, yyyy')}
                  <span className="text-muted-foreground ml-1">
                    {format(new Date(entry.start_time), 'HH:mm')}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {entry.end_time ? (
                  <div className="text-sm">
                    {format(new Date(entry.end_time), 'MMM d, yyyy')}
                    <span className="text-muted-foreground ml-1">
                      {format(new Date(entry.end_time), 'HH:mm')}
                    </span>
                  </div>
                ) : (
                  <span className="text-green-600 font-medium">Running...</span>
                )}
              </TableCell>
              <TableCell>
                {!entry.end_time ? (
                  <span className="text-green-600 font-medium">{calculateLiveDuration(entry.start_time)}</span>
                ) : (
                  formatDuration(entry.duration)
                )}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                {entry.notes || "-"}
              </TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {entry.id.slice(0, 8)}...
                </code>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
