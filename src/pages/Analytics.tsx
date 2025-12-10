import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { WidgetContainer } from "@/components/analytics/WidgetContainer";
import { RiskSuccessWidget } from "@/components/analytics/RiskSuccessWidget";
import { UserFeedbackWidget } from "@/components/analytics/UserFeedbackWidget";
import { MetricsWidget } from "@/components/analytics/MetricsWidget";
import { ChartWidget } from "@/components/analytics/ChartWidget";
import { AddWidgetDialog, WidgetType } from "@/components/analytics/AddWidgetDialog";
import { TimeFrameSelector, TimeFramePreset } from "@/components/analytics/TimeFrameSelector";
import { toast } from "sonner";
import { format, startOfToday, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfToday, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from "date-fns";
import { DateRange } from "react-day-picker";

interface Widget {
  id: string;
  type: WidgetType;
  position: number;
}

export default function Analytics() {
  const { projects, tasks, timeEntries, users, clients, taskStatuses } = useAppContext();
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: 'metrics-1', type: 'metrics', position: 0 },
    { id: 'risk-1', type: 'risk-success', position: 1 },
  ]);
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

  // Calculate metrics (using filtered data)
  const activeProjects = filteredProjects.filter(p => p.status !== 'done').length;
  const pendingTasks = filteredTasks.filter(t => t.status !== 'done').length;
  const teamMembers = users.length;
  const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;

  const metricsData = [
    { label: 'Active Projects', value: activeProjects, change: 12, progress: 65 },
    { label: 'Pending Tasks', value: pendingTasks, change: -8, progress: 45 },
    { label: 'Team Members', value: teamMembers, change: 5 },
    { label: 'Hours Logged', value: Math.round(totalHours), suffix: 'hrs', change: 15 }
  ];

  // Project status data (using filtered data)
  const projectStatusData = [
    { 
      name: 'Active', 
      value: filteredProjects.filter(p => p.status === 'active').length,
      items: filteredProjects.filter(p => p.status === 'active')
    },
    { 
      name: 'Planning', 
      value: filteredProjects.filter(p => p.status === 'planning').length,
      items: filteredProjects.filter(p => p.status === 'planning')
    },
    { 
      name: 'On Hold', 
      value: filteredProjects.filter(p => p.status === 'on-hold').length,
      items: filteredProjects.filter(p => p.status === 'on-hold')
    },
    { 
      name: 'Done', 
      value: filteredProjects.filter(p => p.status === 'done').length,
      items: filteredProjects.filter(p => p.status === 'done')
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
                    const isFullWidth = widget.type === 'metrics' || widget.type === 'risk-success';
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
