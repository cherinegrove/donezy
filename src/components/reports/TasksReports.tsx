
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ReportTile } from "./ReportTile";
import { Task } from "@/types";

interface TasksReportsProps {
  tasks: Task[];
}

export function TasksReports({ tasks }: TasksReportsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  // 1. Total number of overdue tasks
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today.getTime() && task.status !== "done";
  }).length;

  // 2. Total number of tasks due today
  const tasksDueToday = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }).length;

  // 3. Total number of tasks due this week
  const tasksDueThisWeek = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= today && dueDate <= nextWeek;
  }).length;

  // 4. Total tasks by status
  const taskStatusData = [
    { name: "Backlog", value: tasks.filter(t => t.status === "backlog").length, color: "#8884d8" },
    { name: "To Do", value: tasks.filter(t => t.status === "todo").length, color: "#82ca9d" },
    { name: "In Progress", value: tasks.filter(t => t.status === "in-progress").length, color: "#ffc658" },
    { name: "Review", value: tasks.filter(t => t.status === "review").length, color: "#ff7300" },
    { name: "Done", value: tasks.filter(t => t.status === "done").length, color: "#00ff00" }
  ].filter(item => item.value > 0);

  // Summary data for the bar chart
  const dueDateSummary = [
    { name: "Overdue", value: overdueTasks, color: "#dc2626" },
    { name: "Due Today", value: tasksDueToday, color: "#ff4444" },
    { name: "Due This Week", value: tasksDueThisWeek, color: "#ffaa44" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ReportTile title="Tasks Due Summary">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dueDateSummary}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Tasks by Status">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={taskStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {taskStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Task Metrics Summary" className="lg:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{overdueTasks}</div>
            <div className="text-sm text-muted-foreground">Overdue Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{tasksDueToday}</div>
            <div className="text-sm text-muted-foreground">Tasks Due Today</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{tasksDueThisWeek}</div>
            <div className="text-sm text-muted-foreground">Tasks Due This Week</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{tasks.length}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>
        </div>
      </ReportTile>
    </div>
  );
}
