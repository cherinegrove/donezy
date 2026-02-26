import React, { useState, useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ChevronDown, ChevronRight, Download, Building2, Briefcase, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { downloadCSV } from "@/utils/exportUtils";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";

type DatePreset = "this-week" | "last-week" | "this-month" | "last-month" | "last-3-months" | "custom";

export function ClientTimeReport() {
  const { timeEntries, projects, clients, tasks, currentUser, customRoles, users } = useAppContext();
  
  const [datePreset, setDatePreset] = useState<DatePreset>("this-month");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Check if current user is admin
  const isAdmin = () => {
    if (!currentUser) return false;
    return currentUser.systemRoles?.includes('platform_admin') || 
           currentUser.systemRoles?.includes('support_admin') ||
           currentUser.roleId === 'admin' ||
           customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin';
  };

  // Create filter options - show user filter for admins
  const filterOptions: FilterOption[] = useMemo(() => [
    // Only show user filter for admins
    ...(isAdmin() ? [{
      id: "user",
      name: "User",
      options: users.map(user => ({
        id: user.id,
        label: user.name
      }))
    }] : []),
    {
      id: "client",
      name: "Client",
      options: clients.map(client => ({
        id: client.id,
        label: client.name
      }))
    },
    {
      id: "project",
      name: "Project",
      options: projects.map(project => ({
        id: project.id,
        label: project.name
      }))
    },
    {
      id: "status",
      name: "Status",
      options: [
        { id: "pending", label: "Pending" },
        { id: "approved", label: "Approved" },
        { id: "declined", label: "Declined" }
      ]
    }
  ], [clients, projects, users, currentUser, customRoles]);

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case "this-week":
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case "last-week":
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
      case "this-month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "last-month":
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "last-3-months":
        return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
      case "custom":
        return customDateRange;
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  }, [datePreset, customDateRange]);

  // Filter and group time entries by client
  const clientData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    const filteredEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      const isInDateRange = isWithinInterval(entryDate, { start: dateRange.from!, end: dateRange.to! });
      
      if (!isInDateRange) return false;
      
      // For non-admins, always filter to only their own entries
      if (!isAdmin() && entry.userId !== currentUser?.id) {
        return false;
      }

      // Check user filter (admin only)
      if (selectedFilters.user?.length > 0) {
        if (!selectedFilters.user.includes(entry.userId)) {
          return false;
        }
      }

      // Get task and project for filtering
      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
      const project = task 
        ? projects.find(p => p.id === task.projectId) 
        : (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
      const client = project 
        ? clients.find(c => c.id === project.clientId) 
        : (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);

      // Check client filter
      if (selectedFilters.client?.length > 0) {
        const clientId = client?.id || entry.clientId;
        if (!clientId || !selectedFilters.client.includes(clientId)) {
          return false;
        }
      }

      // Check project filter
      if (selectedFilters.project?.length > 0) {
        const projectId = project?.id || entry.projectId;
        if (!projectId || !selectedFilters.project.includes(projectId)) {
          return false;
        }
      }

      // Check status filter
      if (selectedFilters.status?.length > 0) {
        const entryStatus = entry.status || 'pending';
        const normalizedStatus = entryStatus.startsWith('approved') ? 'approved' : entryStatus;
        if (!selectedFilters.status.includes(normalizedStatus)) {
          return false;
        }
      }

      return true;
    });

    // Group by client
    const byClient: Record<string, {
      client: { id: string; name: string };
      totalMinutes: number;
      projects: Record<string, {
        project: { id: string; name: string };
        totalMinutes: number;
        entries: typeof timeEntries;
      }>;
    }> = {};

    filteredEntries.forEach(entry => {
      // Get project and client
      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
      const project = task 
        ? projects.find(p => p.id === task.projectId) 
        : (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
      const client = project 
        ? clients.find(c => c.id === project.clientId) 
        : (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);

      const clientId = client?.id || 'no-client';
      const clientName = client?.name || 'No Client';
      const projectId = project?.id || 'no-project';
      const projectName = project?.name || 'No Project';

      if (!byClient[clientId]) {
        byClient[clientId] = {
          client: { id: clientId, name: clientName },
          totalMinutes: 0,
          projects: {},
        };
      }

      byClient[clientId].totalMinutes += entry.duration;

      if (!byClient[clientId].projects[projectId]) {
        byClient[clientId].projects[projectId] = {
          project: { id: projectId, name: projectName },
          totalMinutes: 0,
          entries: [],
        };
      }

      byClient[clientId].projects[projectId].totalMinutes += entry.duration;
      byClient[clientId].projects[projectId].entries.push(entry);
    });

    return Object.values(byClient).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [timeEntries, projects, clients, tasks, dateRange, selectedFilters, currentUser, customRoles]);

  // Calculate totals by status
  const totals = useMemo(() => {
    let total = 0;
    let approvedBillable = 0;
    let approvedNonBillable = 0;
    let declined = 0;

    clientData.forEach(({ projects: projectsData }) => {
      Object.values(projectsData).forEach(({ entries }) => {
        entries.forEach(entry => {
          total += entry.duration;
          const status = entry.status || 'pending';
          if (status === 'approved-billable') {
            approvedBillable += entry.duration;
          } else if (status === 'approved-non-billable') {
            approvedNonBillable += entry.duration;
          } else if (status === 'declined') {
            declined += entry.duration;
          }
        });
      });
    });

    return { total, approvedBillable, approvedNonBillable, declined };
  }, [clientData]);

  const totalMinutes = totals.total;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const formatHoursDecimal = (minutes: number) => {
    return (minutes / 60).toFixed(2);
  };

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleExport = (detailed = false) => {
    const dateLabel = dateRange.from && dateRange.to
      ? `${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`
      : "report";

    if (detailed) {
      // Itemised export: one row per time entry
      const rows = [
        ["Date", "Time", "Client", "Project", "Task", "User", "Duration (hrs)", "Duration (h:m)", "Status", "Notes"],
      ];

      clientData.forEach(({ client, projects: projectsData }) => {
        Object.values(projectsData).forEach(({ project, entries }) => {
          // Sort entries by start time ascending
          const sorted = [...entries].sort(
            (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
          sorted.forEach(entry => {
            const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
            const user = users.find(u => u.id === entry.userId);
            const entryDate = format(new Date(entry.startTime), "yyyy-MM-dd");
            const entryTime = format(new Date(entry.startTime), "HH:mm");
            const durationHrs = formatHoursDecimal(entry.duration);
            const durationHM = formatDuration(entry.duration);
            const status = entry.status || "pending";
            const notes = (entry.notes || "").replace(/"/g, '""');
            rows.push([
              entryDate,
              entryTime,
              `"${client.name}"`,
              `"${project.name}"`,
              `"${task?.title || "-"}"`,
              `"${user?.name || "Unknown"}"`,
              durationHrs,
              durationHM,
              status,
              `"${notes}"`,
            ]);
          });
        });
      });

      // Totals row
      rows.push(["", "", "TOTAL", "", "", "", formatHoursDecimal(totalMinutes), formatDuration(totalMinutes), "", ""]);

      const csvContent = rows.map(row => row.join(",")).join("\n");
      downloadCSV(csvContent, `time-itemised_${dateLabel}.csv`);
    } else {
      // Summary export: client / project totals only
      const rows = [
        ["Client", "Project", "Total Hours", "Total Minutes"],
      ];

      clientData.forEach(({ client, projects, totalMinutes }) => {
        rows.push([client.name, "", formatHoursDecimal(totalMinutes), totalMinutes.toString()]);
        Object.values(projects).forEach(({ project, totalMinutes: projectMinutes }) => {
          rows.push(["", project.name, formatHoursDecimal(projectMinutes), projectMinutes.toString()]);
        });
      });

      rows.push(["TOTAL", "", formatHoursDecimal(totalMinutes), totalMinutes.toString()]);

      const csvContent = rows.map(row => row.join(",")).join("\n");
      downloadCSV(csvContent, `time-by-client_${dateLabel}.csv`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <span className="text-sm text-muted-foreground">Period:</span>
                <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="last-week">Last Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {datePreset === "custom" && (
                  <div className="flex gap-2 items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateRange.from ? format(customDateRange.from, "PP") : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customDateRange.from}
                          onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground">to</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateRange.to ? format(customDateRange.to, "PP") : "End"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customDateRange.to}
                          onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport(false)}>
                  <Download className="h-4 w-4 mr-2" />
                  Summary CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Detailed CSV
                </Button>
              </div>
            </div>
            
            {/* Additional Filters */}
            <FilterBar 
              filters={filterOptions} 
              onFilterChange={setSelectedFilters} 
            />

            {dateRange.from && dateRange.to && (
              <div className="text-sm text-muted-foreground">
                Showing data from {format(dateRange.from, "PP")} to {format(dateRange.to, "PP")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="text-2xl font-bold">{formatDuration(totals.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved Billable</p>
                <p className="text-2xl font-bold">{formatDuration(totals.approvedBillable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved Non-Billable</p>
                <p className="text-2xl font-bold">{formatDuration(totals.approvedNonBillable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Declined</p>
                <p className="text-2xl font-bold">{formatDuration(totals.declined)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Time by Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No time entries found for the selected period.
            </p>
          ) : (
            <div className="space-y-2">
              {clientData.map(({ client, totalMinutes: clientMinutes, projects: projectsData }) => (
                <Collapsible
                  key={client.id}
                  open={expandedClients.has(client.id)}
                  onOpenChange={() => toggleClient(client.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        {expandedClients.has(client.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{client.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {Object.keys(projectsData).length} projects
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {formatHoursDecimal(clientMinutes)} hrs
                        </span>
                        <span className="font-mono font-semibold">
                          {formatDuration(clientMinutes)}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-8 mt-1 space-y-1">
                      {Object.values(projectsData).map(({ project, totalMinutes: projectMinutes }) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-2 pl-4 border-l-2 border-border hover:bg-muted/30 rounded-r-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{project.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">
                              {formatHoursDecimal(projectMinutes)} hrs
                            </span>
                            <span className="font-mono text-sm">
                              {formatDuration(projectMinutes)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
