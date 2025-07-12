import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ReportTile } from "./ReportTile";
import { Project, Task } from "@/types";

interface ProjectsReportsProps {
  projects: Project[];
  tasks: Task[];
}

export function ProjectsReports({ projects, tasks }: ProjectsReportsProps) {
  // Project status distribution
  const projectStatusData = [
    { name: "To Do", value: projects.filter(p => p.status === "todo").length, color: "#8884d8" },
    { name: "In Progress", value: projects.filter(p => p.status === "in-progress").length, color: "#82ca9d" },
    { name: "Done", value: projects.filter(p => p.status === "done").length, color: "#ffc658" }
  ];

  // Project progress
  const projectProgress = projects.map(project => {
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    const completedTasks = projectTasks.filter(task => task.status === "done").length;
    const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
    
    return {
      name: project.name,
      progress: Math.round(progress),
      totalTasks: projectTasks.length,
      completedTasks
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ReportTile title="Project Status Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={projectStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {projectStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Project Progress">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={projectProgress}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
            <Bar dataKey="progress" fill="#ff7300" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>
    </div>
  );
}