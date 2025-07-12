import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";
import { ReportTile } from "./ReportTile";

import { TimeEntry } from "@/types";

interface User {
  id: string;
  name: string;
  teamIds?: string[];
}

interface Team {
  id: string;
  name: string;
}

interface TimeReportsProps {
  timeEntries: TimeEntry[];
  users: User[];
  teams: Team[];
}

export function TimeReports({ timeEntries, users, teams }: TimeReportsProps) {
  // Time tracking by day
  const timeByDay = timeEntries.reduce((acc, entry) => {
    const date = new Date(entry.startTime).toLocaleDateString();
    const hours = entry.duration / 60;
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.hours += hours;
      if (entry.status === 'approved' || entry.status === 'approved-billable') existing.billableHours += hours;
    } else {
      acc.push({
        date,
        hours,
        billableHours: (entry.status === 'approved' || entry.status === 'approved-billable') ? hours : 0
      });
    }
    return acc;
  }, [] as { date: string; hours: number; billableHours: number }[]);

  // Team productivity
  const teamProductivity = teams.map(team => {
    const teamMembers = users.filter(user => user.teamIds?.includes(team.id));
    const teamTimeEntries = timeEntries.filter(entry => 
      teamMembers.some(member => member.id === entry.userId)
    );
    
    return {
      name: team.name,
      hours: teamTimeEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60,
      members: teamMembers.length
    };
  });

  // Daily patterns (average hours by day of week)
  const dailyPatterns = (() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayData = Array.from({ length: 7 }, (_, i) => ({
      day: dayNames[i],
      hours: 0,
      count: 0
    }));

    timeEntries.forEach(entry => {
      const dayOfWeek = new Date(entry.startTime).getDay();
      const hours = entry.duration / 60;
      dayData[dayOfWeek].hours += hours;
      dayData[dayOfWeek].count += 1;
    });

    return dayData.map(day => ({
      day: day.day,
      averageHours: day.count > 0 ? day.hours / day.count : 0
    }));
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ReportTile title="Time Tracking Trends" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeByDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="hours" stroke="#8884d8" name="Total Hours" />
            <Line type="monotone" dataKey="billableHours" stroke="#82ca9d" name="Billable Hours" />
          </LineChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Team Productivity">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={teamProductivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="hours" fill="#8884d8" name="Hours" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Daily Time Patterns">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyPatterns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}h`, 'Average Hours']} />
            <Bar dataKey="averageHours" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>
    </div>
  );
}