import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from "recharts";
import { ReportTile } from "./ReportTile";
import { Task } from "@/types";

interface TasksReportsProps {
  tasks: Task[];
}

export function TasksReports({ tasks }: TasksReportsProps) {
  // Task status distribution
  const taskStatusData = [
    { name: "Backlog", value: tasks.filter(t => t.status === "backlog").length, color: "#8884d8" },
    { name: "To Do", value: tasks.filter(t => t.status === "todo").length, color: "#82ca9d" },
    { name: "In Progress", value: tasks.filter(t => t.status === "in-progress").length, color: "#ffc658" },
    { name: "Review", value: tasks.filter(t => t.status === "review").length, color: "#ff7300" },
    { name: "Done", value: tasks.filter(t => t.status === "done").length, color: "#00ff00" }
  ];

  // Task priority distribution
  const taskPriorityData = [
    { name: "Low", value: tasks.filter(t => t.priority === "low").length, color: "#82ca9d" },
    { name: "Medium", value: tasks.filter(t => t.priority === "medium").length, color: "#ffc658" },
    { name: "High", value: tasks.filter(t => t.priority === "high").length, color: "#ff7300" }
  ];

  // Task completion trends (last 30 days)
  const completionTrends = (() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const completedTasks = tasks.filter(task => 
        task.status === "done" && 
        task.createdAt && 
        task.createdAt.split('T')[0] === date
      ).length;
      
      return {
        date: new Date(date).toLocaleDateString(),
        completed: completedTasks
      };
    });
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ReportTile title="Task Status Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={taskStatusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Task Priority Breakdown">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={taskPriorityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Task Completion Trends (Last 30 Days)" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={completionTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="completed" stroke="#8884d8" name="Completed Tasks" />
          </LineChart>
        </ResponsiveContainer>
      </ReportTile>
    </div>
  );
}