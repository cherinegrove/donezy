
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ReportTile } from "./ReportTile";
import { Project, Task, Client, Team } from "@/types";

interface ProjectsReportsProps {
  projects: Project[];
  tasks: Task[];
  clients?: Client[];
  teams?: Team[];
}

export function ProjectsReports({ projects, tasks, clients = [], teams = [] }: ProjectsReportsProps) {
  // 1. Number of Projects by status
  const projectStatusData = [
    { name: "To Do", value: projects.filter(p => p.status === "todo").length, color: "#8884d8" },
    { name: "In Progress", value: projects.filter(p => p.status === "in-progress").length, color: "#82ca9d" },
    { name: "Done", value: projects.filter(p => p.status === "done").length, color: "#ffc658" },
    { name: "On Hold", value: projects.filter(p => p.status === "on-hold").length, color: "#ff7300" },
    { name: "Cancelled", value: projects.filter(p => p.status === "cancelled").length, color: "#ff0000" }
  ].filter(item => item.value > 0);

  // 2. Total Projects by Client
  const projectsByClient = clients.map(client => {
    const clientProjects = projects.filter(project => project.clientId === client.id);
    return {
      name: client.name,
      projects: clientProjects.length
    };
  }).filter(item => item.projects > 0);

  // 3. Total Projects by Team
  const projectsByTeam = teams.map(team => {
    const teamProjects = projects.filter(project => 
      project.teamIds && project.teamIds.includes(team.id)
    );
    return {
      name: team.name,
      projects: teamProjects.length
    };
  }).filter(item => item.projects > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ReportTile title="Projects by Status">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={projectStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
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

      <ReportTile title="Projects by Client">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={projectsByClient}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="projects" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Projects by Team" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={projectsByTeam}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="projects" fill="#ff7300" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>
    </div>
  );
}
