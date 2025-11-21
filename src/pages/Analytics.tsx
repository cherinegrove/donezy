import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Download, Sparkles } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { WidgetContainer } from "@/components/analytics/WidgetContainer";
import { RiskSuccessWidget } from "@/components/analytics/RiskSuccessWidget";
import { MetricsWidget } from "@/components/analytics/MetricsWidget";
import { ChartWidget } from "@/components/analytics/ChartWidget";
import { AddWidgetDialog, WidgetType } from "@/components/analytics/AddWidgetDialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Widget {
  id: string;
  type: WidgetType;
  position: number;
}

export default function Analytics() {
  const { projects, tasks, timeEntries, users, clients } = useAppContext();
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: 'metrics-1', type: 'metrics', position: 0 },
    { id: 'risk-1', type: 'risk-success', position: 1 },
  ]);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);

  // Calculate metrics
  const activeProjects = projects.filter(p => p.status !== 'done').length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  const teamMembers = users.length;
  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;

  const metricsData = [
    { label: 'Active Projects', value: activeProjects, change: 12, progress: 65 },
    { label: 'Pending Tasks', value: pendingTasks, change: -8, progress: 45 },
    { label: 'Team Members', value: teamMembers, change: 5 },
    { label: 'Hours Logged', value: Math.round(totalHours), suffix: 'hrs', change: 15 }
  ];

  // Project status data
  const projectStatusData = [
    { name: 'Active', value: projects.filter(p => p.status === 'active').length },
    { name: 'Planning', value: projects.filter(p => p.status === 'planning').length },
    { name: 'On Hold', value: projects.filter(p => p.status === 'on-hold').length },
    { name: 'Done', value: projects.filter(p => p.status === 'done').length },
  ];

  // Task distribution data
  const taskDistributionData = [
    { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length },
    { name: 'Review', value: tasks.filter(t => t.status === 'review').length },
    { name: 'Done', value: tasks.filter(t => t.status === 'done').length },
  ];

  // Time tracking by user
  const timeByUser = users.map(user => ({
    name: user.name,
    hours: Math.round(
      timeEntries
        .filter(e => e.userId === user.id)
        .reduce((sum, e) => sum + (e.duration || 0), 0) / 60
    )
  })).filter(u => u.hours > 0).slice(0, 5);

  // Budget overview
  const budgetData = projects.map(p => ({
    name: p.name,
    allocated: p.allocatedHours || 0,
    used: p.usedHours || 0
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
    const data = { projects, tasks, timeEntries, users, clients };

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
            title="Risk & Success Detection"
            icon={<Sparkles className="h-5 w-5" />}
            onRemove={() => removeWidget(widget.id)}
          >
            <RiskSuccessWidget data={data} />
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
            />
          </WidgetContainer>
        );

      default:
        return null;
    }
  };

  const exportDashboard = () => {
    const data = {
      exportDate: format(new Date(), 'PPpp'),
      metrics: metricsData,
      widgets: widgets.map(w => w.type),
      summary: {
        projects: projects.length,
        tasks: tasks.length,
        hours: totalHours
      }
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success("Dashboard exported successfully");
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
              <Button variant="outline" onClick={exportDashboard}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
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
                  .map((widget, index) => (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          {renderWidget(widget)}
                        </div>
                      )}
                    </Draggable>
                  ))}
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
