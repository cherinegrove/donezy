import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { WidgetContainer } from "@/components/analytics/WidgetContainer";
import { RiskSuccessWidget } from "@/components/analytics/RiskSuccessWidget";
import { UserFeedbackWidget } from "@/components/analytics/UserFeedbackWidget";
import { MetricsWidget } from "@/components/analytics/MetricsWidget";
import { ChartWidget } from "@/components/analytics/ChartWidget";
import { MultiLineChartWidget } from "@/components/analytics/MultiLineChartWidget";
import { AddWidgetDialog, WidgetType } from "@/components/analytics/AddWidgetDialog";
import { TimeFrameSelector, TimeFramePreset } from "@/components/analytics/TimeFrameSelector";
import { toast } from "sonner";
import { format, startOfToday, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfToday, endOfWeek, endOfMonth, endOfQuarter, endOfYear, eachDayOfInterval, eachMonthOfInterval, parseISO, isSameDay, isSameMonth } from "date-fns";
import { DateRange } from "react-day-picker";

interface Widget {
  id: string;
  type: WidgetType;
  position: number;
}

const STORAGE_KEY = 'analytics-widgets';

const defaultWidgets: Widget[] = [
  { id: 'metrics-1', type: 'metrics', position: 0 },
  { id: 'risk-1', type: 'risk-success', position: 1 },
];

export default function Analytics() {
  const { projects, tasks, timeEntries, users, clients, taskStatuses, projectStatuses, currentUser } = useAppContext();
  
  // Load widgets from localStorage on mount
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved widgets:', e);
    }
    return defaultWidgets;
  });
  
  // Save widgets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.error('Error saving widgets:', e);
    }
  }, [widgets]);
  
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [timeFrame, setTimeFrame] = useState<TimeFramePreset>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

  // Calculate date range based on preset
  const getDateRange = (): { from: Date; to: Date } => {
    if (timeFrame === 'custom' && customDateRange?.from && customDateRange?.to) {
      return { from: customDateRange.from, to: customDateRange.to };
    }

    switch (timeFrame) {
      case 'today':
        return { from: startOfToday(), to: endOfToday() };
      case 'week':
        return { from: startOfWeek(new Date()), to: endOfWeek(new Date()) };
      case 'month':
        return { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
      case 'quarter':
        return { from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) };
      case 'year':
        return { from: startOfYear(new Date()), to: endOfYear(new Date()) };
      default:
        return { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
    }
  };

  const dateRange = getDateRange();

  // For now, show all projects and tasks (no createdAt field in types)
  // Only filter time entries by date range
  const filteredProjects = projects;
  const filteredTasks = tasks;
  const filteredTimeEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.startTime);
    return entryDate >= dateRange.from && entryDate <= dateRange.to;
  });

  // Determine which statuses are "final" (completed) - use projectStatuses if available
  const finalProjectStatuses = projectStatuses
    .filter(s => s.isFinal)
    .map(s => s.value?.toLowerCase() || s.label.toLowerCase());
  
  // Fallback: if no final statuses defined, use common completion status names
  const completedStatusNames = finalProjectStatuses.length > 0 
    ? finalProjectStatuses 
    : ['done', 'completed', 'finished', 'closed'];
  
  // "In Progress" projects = projects with in-progress status (not planning, not completed)
  const inProgressProjects = filteredProjects.filter(p => {
    const status = p.status?.toLowerCase() || '';
    return status === 'in-progress' || status === 'active' || status === 'in progress';
  }).length;
  
  // "Open" projects = all non-completed projects
  const openProjects = filteredProjects.filter(p => {
    const status = p.status?.toLowerCase() || '';
    return !completedStatusNames.includes(status);
  }).length;

  const pendingTasks = filteredTasks.filter(t => t.status !== 'done').length;
  const teamMembers = users.length;
  const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;

  const metricsData = [
    { label: 'In Progress', value: inProgressProjects, change: 12, progress: 65 },
    { label: 'Pending Tasks', value: pendingTasks, change: -8, progress: 45 },
    { label: 'Team Members', value: teamMembers, change: 5 },
    { label: 'Hours Logged', value: Math.round(totalHours), suffix: 'hrs', change: 15 }
  ];

  // Project status data - use dynamic project statuses
  const projectStatusData = projectStatuses.length > 0
    ? projectStatuses.map(status => {
        const statusValue = status.value?.toLowerCase() || status.label.toLowerCase();
        const matchingProjects = filteredProjects.filter(p => {
          const projectStatus = p.status?.toLowerCase() || '';
          return projectStatus === statusValue || 
                 projectStatus === status.label.toLowerCase() ||
                 projectStatus.replace(/[- ]/g, '') === statusValue.replace(/[- ]/g, '');
        });
        return {
          name: status.label,
          value: matchingProjects.length,
          items: matchingProjects
        };
      })
    : [
        { 
          name: 'In Progress', 
          value: filteredProjects.filter(p => p.status?.toLowerCase() === 'in-progress').length,
          items: filteredProjects.filter(p => p.status?.toLowerCase() === 'in-progress')
        },
        { 
          name: 'Planning', 
          value: filteredProjects.filter(p => p.status?.toLowerCase() === 'planning').length,
          items: filteredProjects.filter(p => p.status?.toLowerCase() === 'planning')
        },
        { 
          name: 'Completed', 
          value: filteredProjects.filter(p => p.status?.toLowerCase() === 'completed').length,
          items: filteredProjects.filter(p => p.status?.toLowerCase() === 'completed')
        },
      ];

  // Task distribution data (using filtered data and dynamic statuses)
  const taskDistributionData = taskStatuses
    .sort((a, b) => a.order - b.order)
    .map(status => ({
      name: status.label,
      value: filteredTasks.filter(t => t.status === status.value).length,
      items: filteredTasks.filter(t => t.status === status.value)
    }));

  // Time tracking by user (using filtered data)
  const timeByUser = users.map(user => ({
    name: user.name,
    hours: Math.round(
      filteredTimeEntries
        .filter(e => e.userId === user.id)
        .reduce((sum, e) => sum + (e.duration || 0), 0) / 60
    ),
    userId: user.id,
    items: filteredTimeEntries.filter(e => e.userId === user.id)
  })).filter(u => u.hours > 0).slice(0, 5);

  // Daily time tracking data - hours per day for each user
  const dailyTimeData = (() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map(day => {
      const dayData: Record<string, any> = {
        date: format(day, 'MMM dd'),
        fullDate: day
      };
      users.forEach(user => {
        const userHours = filteredTimeEntries
          .filter(e => e.userId === user.id && isSameDay(parseISO(e.startTime), day))
          .reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
        dayData[user.name] = Math.round(userHours * 100) / 100;
      });
      return dayData;
    });
  })();

  // Monthly time tracking data - hours per month for each user
  const monthlyTimeData = (() => {
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    return months.map(month => {
      const monthData: Record<string, any> = {
        date: format(month, 'MMM yyyy'),
        fullDate: month
      };
      users.forEach(user => {
        const userHours = filteredTimeEntries
          .filter(e => e.userId === user.id && isSameMonth(parseISO(e.startTime), month))
          .reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
        monthData[user.name] = Math.round(userHours * 100) / 100;
      });
      return monthData;
    });
  })();

  // Get users who have logged time for the line chart keys
  const activeUserNames = users
    .filter(user => filteredTimeEntries.some(e => e.userId === user.id))
    .map(user => user.name)
    .slice(0, 8); // Limit to 8 users for readability

  // Budget overview (using filtered data)
  const budgetData = filteredProjects.map(p => ({
    name: p.name,
    allocated: p.allocatedHours || 0,
    used: p.usedHours || 0,
    projectId: p.id
  })).slice(0, 5);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedWidgets = items.map((item, index) => ({
      ...item,
      position: index
    }));

    setWidgets(updatedWidgets);
    toast.success("Dashboard layout updated");
  };

  const addWidget = (type: WidgetType) => {
    const newWidget: Widget = {
      id: `${type}-${Date.now()}`,
      type,
      position: widgets.length
    };
    setWidgets([...widgets, newWidget]);
    toast.success("Widget added to dashboard");
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    toast.success("Widget removed");
  };

  const renderWidget = (widget: Widget) => {
    const data = { projects: filteredProjects, tasks: filteredTasks, timeEntries: filteredTimeEntries, users, clients };

    switch (widget.type) {
      case 'metrics':
        return (
          <WidgetContainer
            title="Key Metrics"
            icon={<Sparkles className="h-5 w-5" />}
            onRemove={() => removeWidget(widget.id)}
          >
            <MetricsWidget metrics={metricsData} />
          </WidgetContainer>
        );

      case 'risk-success':
        return (
          <WidgetContainer
            title="AI Pulse Check"
            icon={<Sparkles className="h-5 w-5" />}
            onRemove={() => removeWidget(widget.id)}
          >
            <RiskSuccessWidget data={data} />
          </WidgetContainer>
        );

      case 'user-feedback':
        return (
          <WidgetContainer
            title="User Performance Feedback"
            icon={<Sparkles className="h-5 w-5" />}
            onRemove={() => removeWidget(widget.id)}
          >
            <UserFeedbackWidget data={data} />
          </WidgetContainer>
        );

      case 'project-status':
        return (
          <WidgetContainer
            title="Project Status Distribution"
            onRemove={() => removeWidget(widget.id)}
          >
            <ChartWidget
              type="pie"
              data={projectStatusData}
              dataKey="value"
              nameKey="name"
              onDataClick={(data) => data.items}
            />
          </WidgetContainer>
        );

      case 'task-distribution':
        return (
          <WidgetContainer
            title="Task Distribution"
            onRemove={() => removeWidget(widget.id)}
          >
            <ChartWidget
              type="bar"
              data={taskDistributionData}
              dataKey="value"
              nameKey="name"
              onDataClick={(data) => data.items}
            />
          </WidgetContainer>
        );

      case 'time-tracking':
        return (
          <WidgetContainer
            title="Time Tracking by User"
            onRemove={() => removeWidget(widget.id)}
          >
            <ChartWidget
              type="bar"
              data={timeByUser}
              dataKey="hours"
              nameKey="name"
              onDataClick={(data) => data.items}
            />
          </WidgetContainer>
        );

      case 'time-tracking-daily':
        return (
          <WidgetContainer
            title="Daily Time by User"
            onRemove={() => removeWidget(widget.id)}
          >
            {activeUserNames.length > 0 ? (
              <MultiLineChartWidget
                data={dailyTimeData}
                lineKeys={activeUserNames}
                xAxisKey="date"
                yAxisLabel="Hours"
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No time entries in selected period
              </div>
            )}
          </WidgetContainer>
        );

      case 'time-tracking-monthly':
        return (
          <WidgetContainer
            title="Monthly Time by User"
            onRemove={() => removeWidget(widget.id)}
          >
            {activeUserNames.length > 0 ? (
              <MultiLineChartWidget
                data={monthlyTimeData}
                lineKeys={activeUserNames}
                xAxisKey="date"
                yAxisLabel="Hours"
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No time entries in selected period
              </div>
            )}
          </WidgetContainer>
        );

      case 'budget-overview':
        return (
          <WidgetContainer
            title="Budget Overview"
            onRemove={() => removeWidget(widget.id)}
          >
            <ChartWidget
              type="line"
              data={budgetData}
              dataKey="used"
              nameKey="name"
              onDataClick={(data) => [data]}
            />
          </WidgetContainer>
        );

      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Smart Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-powered insights and interactive dashboards
              </p>
            </div>
            <div className="flex gap-2">
              <TimeFrameSelector
                preset={timeFrame}
                onPresetChange={setTimeFrame}
                dateRange={customDateRange}
                onDateRangeChange={setCustomDateRange}
              />
              <Button onClick={() => setAddWidgetOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {widgets
                  .sort((a, b) => a.position - b.position)
                  .map((widget, index) => {
                    const isFullWidth = widget.type === 'metrics' || widget.type === 'risk-success' || widget.type === 'time-tracking-daily' || widget.type === 'time-tracking-monthly';
                    return (
                      <Draggable key={widget.id} draggableId={widget.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={isFullWidth ? 'lg:col-span-2' : ''}
                          >
                            {renderWidget(widget)}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start Building Your Dashboard</h3>
            <p className="text-muted-foreground mb-6">
              Add widgets to create your personalized analytics view
            </p>
            <Button onClick={() => setAddWidgetOpen(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Widget
            </Button>
          </div>
        )}
      </div>

      <AddWidgetDialog
        open={addWidgetOpen}
        onOpenChange={setAddWidgetOpen}
        onAddWidget={addWidget}
      />
    </div>
  );
}
