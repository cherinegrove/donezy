import { useMemo, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, parseISO, format } from "date-fns";

interface UserTimeTrackingReportProps {
  userId?: string; // If not provided, uses current user
  showTitle?: boolean;
}

export const UserTimeTrackingReport = ({ userId, showTitle = true }: UserTimeTrackingReportProps) => {
  const { timeEntries, currentUser, clients, projects, tasks, users } = useAppContext();
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  // Use provided userId or fall back to current user
  const targetUserId = userId || currentUser?.auth_user_id;
  const targetUser = users.find(u => u.auth_user_id === targetUserId);

  const userTimeEntries = useMemo(() => {
    if (!targetUserId) return [];
    return timeEntries.filter(entry => entry.userId === targetUserId);
  }, [timeEntries, targetUserId]);

  const calculatePeriodData = (startDate: Date, endDate: Date) => {
    const entries = userTimeEntries.filter(entry => {
      const entryDate = parseISO(entry.startTime);
      return entryDate >= startDate && entryDate <= endDate;
    });

    // Separate approved and declined entries
    const approvedEntries = entries.filter(entry => 
      entry.status === 'approved-billable' || entry.status === 'approved-non-billable'
    );
    const declinedEntries = entries.filter(entry => entry.status === 'declined');
    const pendingEntries = entries.filter(entry => 
      !entry.status || entry.status === 'pending'
    );

    const totalHours = entries.reduce((sum, entry) => {
      return sum + (entry.duration || 0);
    }, 0);

    const approvedHours = approvedEntries.reduce((sum, entry) => {
      return sum + (entry.duration || 0);
    }, 0);

    const declinedHours = declinedEntries.reduce((sum, entry) => {
      return sum + (entry.duration || 0);
    }, 0);

    const pendingHours = pendingEntries.reduce((sum, entry) => {
      return sum + (entry.duration || 0);
    }, 0);

    // Group by client > project > task
    const byClient = entries.reduce((acc, entry) => {
      const project = projects.find(p => p.id === entry.projectId);
      const task = tasks.find(t => t.id === entry.taskId);
      const client = clients.find(c => c.id === entry.clientId);
      
      const clientId = entry.clientId || 'no-client';
      const clientName = client?.name || 'No Client';
      const projectId = entry.projectId || 'no-project';
      const projectName = project?.name || 'No Project';
      const taskId = entry.taskId || 'no-task';
      const taskName = task?.title || 'No Task';

      if (!acc[clientId]) {
        acc[clientId] = {
          name: clientName,
          hours: 0,
          projects: {}
        };
      }

      if (!acc[clientId].projects[projectId]) {
        acc[clientId].projects[projectId] = {
          name: projectName,
          hours: 0,
          tasks: {}
        };
      }

      if (!acc[clientId].projects[projectId].tasks[taskId]) {
        acc[clientId].projects[projectId].tasks[taskId] = {
          name: taskName,
          hours: 0,
          entries: []
        };
      }

      const hours = (entry.duration || 0) / 60;
      acc[clientId].hours += hours;
      acc[clientId].projects[projectId].hours += hours;
      acc[clientId].projects[projectId].tasks[taskId].hours += hours;
      acc[clientId].projects[projectId].tasks[taskId].entries.push(entry);

      return acc;
    }, {} as Record<string, any>);

    return {
      totalHours: (totalHours / 60).toFixed(2),
      approvedHours: (approvedHours / 60).toFixed(2),
      declinedHours: (declinedHours / 60).toFixed(2),
      pendingHours: (pendingHours / 60).toFixed(2),
      entries: entries.length,
      approvedCount: approvedEntries.length,
      declinedCount: declinedEntries.length,
      pendingCount: pendingEntries.length,
      byClient
    };
  };

  const now = new Date();
  
  const todayData = calculatePeriodData(startOfDay(now), endOfDay(now));
  const thisWeekData = calculatePeriodData(startOfWeek(now), endOfWeek(now));
  const thisMonthData = calculatePeriodData(startOfMonth(now), endOfMonth(now));
  
  const lastWeekStart = startOfWeek(subWeeks(now, 1));
  const lastWeekEnd = endOfWeek(subWeeks(now, 1));
  const lastWeekData = calculatePeriodData(lastWeekStart, lastWeekEnd);
  
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const lastMonthData = calculatePeriodData(lastMonthStart, lastMonthEnd);

  const PeriodDisplay = ({ title, data, icon: Icon, periodKey }: { title: string; data: any; icon: any; periodKey: string }) => {
    const [openClients, setOpenClients] = useState<Record<string, boolean>>({});
    const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});

    return (
      <div className="space-y-3">
        <Collapsible
          open={expandedPeriod === periodKey}
          onOpenChange={() => setExpandedPeriod(expandedPeriod === periodKey ? null : periodKey)}
        >
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">{title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {data.totalHours}h
                </Badge>
                {expandedPeriod === periodKey ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="px-3 pb-2 space-y-3">
            <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
              {data.approvedCount > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                  ✓ {data.approvedHours}h approved ({data.approvedCount})
                </Badge>
              )}
              {data.pendingCount > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                  ⏱ {data.pendingHours}h pending ({data.pendingCount})
                </Badge>
              )}
              {data.declinedCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                  ✗ {data.declinedHours}h declined ({data.declinedCount})
                </Badge>
              )}
            </div>

            <div className="pl-3 pt-3 space-y-3">
            {Object.entries(data.byClient).map(([clientId, clientData]: [string, any]) => (
              <div key={clientId} className="border-l-2 border-primary/20 pl-4 space-y-2">
                <Collapsible
                  open={openClients[clientId]}
                  onOpenChange={() => setOpenClients(prev => ({ ...prev, [clientId]: !prev[clientId] }))}
                >
                  <CollapsibleTrigger className="w-full" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between w-full p-2 hover:bg-muted/30 rounded text-left">
                      <div className="flex items-center gap-2">
                        {openClients[clientId] ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span className="font-medium text-sm">{clientData.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {clientData.hours.toFixed(2)}h
                      </Badge>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="pl-5 pt-2 space-y-2">
                    {Object.entries(clientData.projects).map(([projectId, projectData]: [string, any]) => (
                      <div key={projectId} className="border-l-2 border-blue-200 dark:border-blue-800 pl-3 space-y-1">
                        <Collapsible
                          open={openProjects[`${clientId}-${projectId}`]}
                          onOpenChange={() => setOpenProjects(prev => ({ 
                            ...prev, 
                            [`${clientId}-${projectId}`]: !prev[`${clientId}-${projectId}`] 
                          }))}
                        >
                          <CollapsibleTrigger className="w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between w-full p-2 hover:bg-muted/20 rounded text-left">
                              <div className="flex items-center gap-2">
                                {openProjects[`${clientId}-${projectId}`] ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                <span className="text-sm">{projectData.name}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {projectData.hours.toFixed(2)}h
                              </Badge>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="pl-5 pt-1 space-y-1">
                            {Object.entries(projectData.tasks).map(([taskId, taskData]: [string, any]) => (
                              <div key={taskId} className="p-2 bg-muted/30 rounded text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{taskData.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {taskData.hours.toFixed(2)}h
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground space-y-0.5 pl-2">
                                  {taskData.entries.map((entry: any, idx: number) => {
                                    const getStatusBadge = (status: string) => {
                                      switch (status) {
                                        case 'approved-billable':
                                          return <Badge className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200">✓ Approved</Badge>;
                                        case 'approved-non-billable':
                                          return <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200">✓ Non-bill</Badge>;
                                        case 'declined':
                                          return <Badge className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200">✗ Declined</Badge>;
                                        case 'pending':
                                        default:
                                          return <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200">⏱ Pending</Badge>;
                                      }
                                    };
                                    
                                    return (
                                      <div key={idx} className="flex justify-between items-center gap-2">
                                        <div className="flex items-center gap-2 flex-1">
                                          <span>{format(parseISO(entry.startTime), 'MMM d, h:mm a')}</span>
                                          {getStatusBadge(entry.status || 'pending')}
                                        </div>
                                        <span className="font-mono">{((entry.duration || 0) / 60).toFixed(2)}h</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  if (!targetUserId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No user selected
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {targetUser ? `${targetUser.name}'s Time Tracking` : 'Time Tracking'}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "" : "pt-6"}>
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Periods</TabsTrigger>
            <TabsTrigger value="past">Past Periods</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4 mt-4">
            <PeriodDisplay title="Today" data={todayData} icon={Clock} periodKey="today" />
            <div className="border-t pt-3">
              <PeriodDisplay title="This Week" data={thisWeekData} icon={Calendar} periodKey="this-week" />
            </div>
            <div className="border-t pt-3">
              <PeriodDisplay title="This Month" data={thisMonthData} icon={TrendingUp} periodKey="this-month" />
            </div>
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-4">
            <PeriodDisplay title="Last Week" data={lastWeekData} icon={Calendar} periodKey="last-week" />
            <div className="border-t pt-3">
              <PeriodDisplay title="Last Month" data={lastMonthData} icon={TrendingUp} periodKey="last-month" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};