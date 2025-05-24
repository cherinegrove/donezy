import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { format, isWithinInterval, parseISO, differenceInDays, differenceInCalendarDays } from "date-fns";
import { CalendarIcon, Download, ChevronRight, ChevronDown, DollarSign, TrendingUp, ChartPie, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Client, TimeEntry, Project, Task, Purchase, Team, BillingType } from "@/types";
import { Progress } from "@/components/ui/progress";

// Helper function to calculate total hours from minutes
const minutesToHours = (minutes: number) => {
  return +(minutes / 60).toFixed(1);
};

// Helper function to calculate pro-rated cost for monthly employees
const calculateProRatedCost = (
  user: { billingType?: BillingType; monthlyRate?: number; hourlyRate?: number },
  hoursWorked: number,
  dateRange: { from?: Date; to?: Date }
) => {
  // If billing type is hourly, simply multiply hours by rate
  if (user.billingType !== 'monthly' || !dateRange.from || !dateRange.to) {
    // Default to hourly calculation
    return hoursWorked * (user.hourlyRate || 0);
  }
  
  // For monthly paid employees, calculate pro-rated cost
  const monthlyRate = user.monthlyRate || 0;
  const daysInRange = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
  
  // Assuming an average month has 30 days
  const averageMonthDays = 30;
  
  // Pro-rate the monthly rate based on selected date range
  const proRatedRate = (monthlyRate / averageMonthDays) * daysInRange;
  
  return proRatedRate;
};

const Reports = () => {
  const { toast } = useToast();
  const { 
    projects, 
    clients, 
    timeEntries, 
    users, 
    teams, 
    purchases 
  } = useAppContext();
  const [reportType, setReportType] = useState("time");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(),
    to: new Date()
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [expandedUserClients, setExpandedUserClients] = useState<Record<string, boolean>>({});
  const [expandedUserClientProjects, setExpandedUserClientProjects] = useState<Record<string, boolean>>({});
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  
  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      id: "clients",
      name: "Client",
      options: [], // We'll populate this later
    },
    {
      id: "projects",
      name: "Project",
      options: [], // We'll populate this later
    },
    {
      id: "teams",
      name: "Team",
      options: [], // We'll populate this later
    },
    {
      id: "users",
      name: "Team Member",
      options: [], // We'll populate this later
    },
  ];
  
  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  // Filter time entries by date range
  const getFilteredTimeEntries = () => {
    if (!dateRange.from && !dateRange.to) return timeEntries;
    
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      
      if (dateRange.from && dateRange.to) {
        // Set the time of dateRange.to to end of day to include the full day
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        
        return isWithinInterval(entryDate, { 
          start: dateRange.from, 
          end: toDate 
        });
      } else if (dateRange.from) {
        return entryDate >= dateRange.from;
      } else if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        return entryDate <= toDate;
      }
      
      return true;
    });
  };

  // Process data for the client hours report
  const getClientHoursData = () => {
    const filteredEntries = getFilteredTimeEntries();
    
    // Group time entries by client
    const hoursByClient = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.clientId) return acc;
      
      if (!acc[entry.clientId]) {
        acc[entry.clientId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.clientId] += entry.duration;
      
      return acc;
    }, {});
    
    // Convert to chart data format
    return clients.map((client: Client) => {
      const totalMinutes = hoursByClient[client.id] || 0;
      return {
        name: client.name,
        hours: minutesToHours(totalMinutes),
        clientId: client.id,
      };
    }).sort((a, b) => b.hours - a.hours); // Sort by highest hours first
  };

  // Get project hours by client
  const getProjectHoursByClient = (clientId: string) => {
    const filteredEntries = getFilteredTimeEntries();
    
    // Get projects for this client
    const clientProjects = projects.filter((project) => project.clientId === clientId);
    
    // Group time entries by project
    const hoursByProject = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.projectId) return acc;
      
      if (!acc[entry.projectId]) {
        acc[entry.projectId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.projectId] += entry.duration;
      
      return acc;
    }, {});
    
    // Return projects with their hours
    return clientProjects.map((project: Project) => {
      const totalMinutes = hoursByProject[project.id] || 0;
      return {
        name: project.name,
        hours: minutesToHours(totalMinutes),
        projectId: project.id,
      };
    }).sort((a, b) => b.hours - a.hours); // Sort by highest hours first
  };

  // Process data for the team member hours report
  const getUserHoursData = () => {
    const filteredEntries = getFilteredTimeEntries();
    
    // Group time entries by user
    const hoursByUser = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.userId) return acc;
      
      if (!acc[entry.userId]) {
        acc[entry.userId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.userId] += entry.duration;
      
      return acc;
    }, {});
    
    // Convert to data format
    return users.map((user) => {
      const totalMinutes = hoursByUser[user.id] || 0;
      return {
        name: user.name,
        hours: minutesToHours(totalMinutes),
        userId: user.id,
      };
    }).sort((a, b) => b.hours - a.hours); // Sort by highest hours first
  };

  // Get client hours by user
  const getClientHoursByUser = (userId: string) => {
    const filteredEntries = getFilteredTimeEntries().filter(entry => entry.userId === userId);
    
    // Group time entries by client
    const hoursByClient = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.clientId) return acc;
      
      if (!acc[entry.clientId]) {
        acc[entry.clientId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.clientId] += entry.duration;
      
      return acc;
    }, {});
    
    // Return clients with their hours
    return clients.map((client) => {
      const totalMinutes = hoursByClient[client.id] || 0;
      if (totalMinutes === 0) return null; // Skip clients with no hours
      
      return {
        name: client.name,
        hours: minutesToHours(totalMinutes),
        clientId: client.id,
      };
    }).filter(Boolean).sort((a, b) => b!.hours - a!.hours); // Sort by highest hours first
  };

  // Get project hours by user and client
  const getProjectHoursByUserAndClient = (userId: string, clientId: string) => {
    const filteredEntries = getFilteredTimeEntries()
      .filter(entry => entry.userId === userId && entry.clientId === clientId);
    
    // Get projects for this client
    const clientProjects = projects.filter(project => project.clientId === clientId);
    
    // Group time entries by project
    const hoursByProject = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.projectId) return acc;
      
      if (!acc[entry.projectId]) {
        acc[entry.projectId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.projectId] += entry.duration;
      
      return acc;
    }, {});
    
    // Return projects with their hours
    return clientProjects.map((project) => {
      const totalMinutes = hoursByProject[project.id] || 0;
      if (totalMinutes === 0) return null; // Skip projects with no hours
      
      return {
        name: project.name,
        hours: minutesToHours(totalMinutes),
        projectId: project.id,
      };
    }).filter(Boolean).sort((a, b) => b!.hours - a!.hours); // Sort by highest hours first
  };

  // Get task hours by user, client, and project
  const getTaskHoursByUserClientAndProject = (userId: string, clientId: string, projectId: string) => {
    const filteredEntries = getFilteredTimeEntries()
      .filter(entry => entry.userId === userId && entry.clientId === clientId && entry.projectId === projectId);
    
    // Get tasks for this project
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    
    // Group time entries by task
    const hoursByTask = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.taskId) return acc;
      
      if (!acc[entry.taskId]) {
        acc[entry.taskId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.taskId] += entry.duration;
      
      return acc;
    }, {});
    
    // Return tasks with their hours
    return projectTasks.map((task: Task) => {
      const totalMinutes = hoursByTask[task.id] || 0;
      if (totalMinutes === 0) return null; // Skip tasks with no hours
      
      return {
        name: task.title,
        hours: minutesToHours(totalMinutes),
        taskId: task.id,
      };
    }).filter(Boolean).sort((a, b) => b!.hours - a!.hours); // Sort by highest hours first
  };

  // Get Project Progress data
  const getProjectProgressData = () => {
    // Filter active projects
    const activeProjects = projects.filter(project => 
      project.status !== 'done'
    );

    return activeProjects.map(project => {
      // Calculate total hours used for this project
      const projectTimeEntries = timeEntries.filter(entry => {
        const task = tasks.find(t => t.id === entry.taskId);
        return task && task.projectId === project.id;
      });

      const totalMinutesUsed = projectTimeEntries.reduce((total, entry) => total + entry.duration, 0);
      const hoursUsed = minutesToHours(totalMinutesUsed);

      // Calculate completion percentage based on tasks
      const projectTasks = tasks.filter(task => task.projectId === project.id);
      const completedTasks = projectTasks.filter(task => task.status === 'done').length;
      const completionPercentage = projectTasks.length > 0 
        ? Math.round((completedTasks / projectTasks.length) * 100)
        : 0;
      
      // Get client info
      const client = clients.find(c => c.id === project.clientId);

      return {
        project,
        client,
        hoursUsed,
        allocatedHours: project.allocatedHours || 0,
        hoursPercentage: project.allocatedHours ? Math.round((hoursUsed / project.allocatedHours) * 100) : 0,
        completionPercentage,
        completedTasks,
        totalTasks: projectTasks.length
      };
    });
  };

  // Get financial data for revenue by client
  const getClientRevenueData = () => {
    // Filter purchases by date range if needed
    const filteredPurchases = getFilteredPurchases();
    
    // Group purchases by client
    const revenueByClient = filteredPurchases.reduce((acc: Record<string, number>, purchase: Purchase) => {
      if (!purchase.clientId) return acc;
      
      if (!acc[purchase.clientId]) {
        acc[purchase.clientId] = 0;
      }
      
      // Add purchase amount
      acc[purchase.clientId] += purchase.amount;
      
      return acc;
    }, {});
    
    // Get billable time entries to calculate billable time revenue
    const filteredTimeEntries = getFilteredTimeEntries()
      .filter(entry => entry.billable);
    
    // Calculate billable time revenue by client
    filteredTimeEntries.forEach(entry => {
      if (!entry.clientId) return;
      
      const client = clients.find(c => c.id === entry.clientId);
      if (!client || !client.billableRate) return;
      
      if (!revenueByClient[entry.clientId]) {
        revenueByClient[entry.clientId] = 0;
      }
      
      // Calculate revenue based on billable rate and time
      const hours = entry.duration / 60;
      const revenue = hours * client.billableRate;
      
      revenueByClient[entry.clientId] += revenue;
    });
    
    // Convert to chart data format
    return clients.map((client: Client) => {
      const revenue = revenueByClient[client.id] || 0;
      return {
        name: client.name,
        revenue: revenue.toFixed(2),
        clientId: client.id,
        currency: client.currency || 'USD',
      };
    }).sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue)); // Sort by highest revenue first
  };
  
  // Get revenue by service type
  const getRevenueByServiceType = () => {
    const filteredPurchases = getFilteredPurchases();
    
    // Group purchases by service type
    const revenueByType = filteredPurchases.reduce((acc: Record<string, number>, purchase: Purchase) => {
      const serviceType = purchase.serviceType || "other";
      
      if (!acc[serviceType]) {
        acc[serviceType] = 0;
      }
      
      // Add purchase amount
      acc[serviceType] += purchase.amount;
      
      return acc;
    }, {
      "project": 0,
      "bank-hours": 0,
      "pay-as-you-go": 0,
      "other": 0
    });
    
    // Convert to chart data format
    return Object.entries(revenueByType).map(([type, amount]) => ({
      type: type === "bank-hours" ? "Bank Hours" : 
            type === "pay-as-you-go" ? "Pay As You Go" : 
            type === "project" ? "Fixed Project" : "Other",
      amount: amount.toFixed(2),
      percentage: filteredPurchases.length ? 
        ((amount / filteredPurchases.reduce((sum, p) => sum + p.amount, 0)) * 100).toFixed(1) : 
        "0"
    })).sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
  };
  
  // Get filtered purchases
  const getFilteredPurchases = () => {
    if (!dateRange.from && !dateRange.to) return purchases;
    
    return purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.date);
      
      if (dateRange.from && dateRange.to) {
        // Set the time of dateRange.to to end of day to include the full day
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        
        return isWithinInterval(purchaseDate, { 
          start: dateRange.from, 
          end: toDate 
        });
      } else if (dateRange.from) {
        return purchaseDate >= dateRange.from;
      } else if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        return purchaseDate <= toDate;
      }
      
      return true;
    });
  };
  
  // Get monthly revenue data (for trend analysis)
  const getMonthlyRevenueData = () => {
    const filteredPurchases = getFilteredPurchases();
    
    // Group by month
    const revenueByMonth: Record<string, number> = {};
    
    filteredPurchases.forEach(purchase => {
      const date = new Date(purchase.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!revenueByMonth[monthKey]) {
        revenueByMonth[monthKey] = 0;
      }
      
      revenueByMonth[monthKey] += purchase.amount;
    });
    
    // Sort by date and return last 6 months
    return Object.entries(revenueByMonth)
      .map(([monthKey, amount]) => {
        const [year, month] = monthKey.split('-').map(Number);
        return {
          month: format(new Date(year, month - 1), 'MMM yyyy'),
          amount: amount.toFixed(2),
          timestamp: new Date(year, month - 1).getTime()
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-6);
  };
  
  // Calculate total revenue
  const calculateTotalRevenue = () => {
    const filteredPurchases = getFilteredPurchases();
    return filteredPurchases.reduce((total, purchase) => total + purchase.amount, 0).toFixed(2);
  };

  // Get team revenue data
  const getTeamRevenueData = () => {
    const filteredEntries = getFilteredTimeEntries()
      .filter(entry => entry.billable); // Only include billable entries
    
    // Create a map of team data
    const teamData = teams.map(team => {
      // Get team members
      const teamMemberIds = team.members;
      const teamMembers = users.filter(user => teamMemberIds.includes(user.id));
      
      // Calculate total revenue generated by the team
      let totalRevenue = 0;
      
      // Calculate revenue from time entries
      teamMembers.forEach(member => {
        // Get all billable time entries for this user
        const userEntries = filteredEntries.filter(entry => entry.userId === member.id);
        
        userEntries.forEach(entry => {
          const client = clients.find(c => c.id === entry.clientId);
          if (!client || !client.billableRate) return;
          
          const hours = entry.duration / 60;
          const revenue = hours * client.billableRate;
          totalRevenue += revenue;
        });
      });
      
      // Calculate billable hours for the team
      const teamEntries = filteredEntries.filter(entry => {
        const user = users.find(u => u.id === entry.userId);
        return user && teamMemberIds.includes(user.id);
      });
      
      const billableHours = minutesToHours(
        teamEntries.reduce((total, entry) => total + entry.duration, 0)
      );
      
      return {
        teamId: team.id,
        name: team.name,
        memberCount: teamMembers.length,
        billableHours,
        totalRevenue,
      };
    });
    
    return teamData.sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by highest revenue first
  };

  // Get team cost vs revenue data
  const getTeamCostVsRevenueData = () => {
    const filteredEntries = getFilteredTimeEntries();
    
    // Create a map of team data with member details
    const teamData = teams.map(team => {
      // Get team members
      const teamMemberIds = team.members;
      const teamMembers = users.filter(user => teamMemberIds.includes(user.id));
      
      // Calculate data for each team member
      const memberData = teamMembers.map(member => {
        // Get all time entries for this user within the filtered period
        const userEntries = filteredEntries.filter(entry => entry.userId === member.id);
        const billableEntries = userEntries.filter(entry => entry.billable);
        
        // Calculate hours worked and cost
        const hoursWorked = minutesToHours(
          userEntries.reduce((total, entry) => total + entry.duration, 0)
        );
        
        // Calculate cost using pro-rating for monthly employees
        const totalCost = calculateProRatedCost(member, hoursWorked, dateRange);
        
        // Calculate billable revenue
        let totalRevenue = 0;
        billableEntries.forEach(entry => {
          const client = clients.find(c => c.id === entry.clientId);
          if (!client || !client.billableRate) return;
          
          const hours = entry.duration / 60;
          const revenue = hours * client.billableRate;
          totalRevenue += revenue;
        });
        
        // Calculate profit
        const profit = totalRevenue - totalCost;
        
        return {
          userId: member.id,
          name: member.name,
          hoursWorked,
          billingType: member.billingType || 'hourly',
          hourlyRate: member.hourlyRate,
          monthlyRate: member.monthlyRate,
          totalCost,
          totalRevenue,
          profit,
        };
      });
      
      // Calculate team totals
      const teamTotalCost = memberData.reduce((total, member) => total + member.totalCost, 0);
      const teamTotalRevenue = memberData.reduce((total, member) => total + member.totalRevenue, 0);
      const teamTotalProfit = teamTotalRevenue - teamTotalCost;
      const teamTotalHours = memberData.reduce((total, member) => total + member.hoursWorked, 0);
      
      return {
        teamId: team.id,
        name: team.name,
        members: memberData,
        totalHours: teamTotalHours,
        totalCost: teamTotalCost,
        totalRevenue: teamTotalRevenue,
        totalProfit: teamTotalProfit,
      };
    });
    
    return teamData.sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by highest revenue first
  };

  // Get team member revenue data
  const getTeamMemberRevenueData = () => {
    const filteredEntries = getFilteredTimeEntries()
      .filter(entry => entry.billable); // Only include billable entries
    
    // Group time entries by user
    const revenueByUser = users.map(user => {
      // Get all billable time entries for this user
      const userEntries = filteredEntries.filter(entry => entry.userId === user.id);
      
      // Calculate total revenue generated
      const totalRevenue = userEntries.reduce((total, entry) => {
        const client = clients.find(c => c.id === entry.clientId);
        if (!client || !client.billableRate) return total;
        
        const hours = entry.duration / 60;
        const revenue = hours * client.billableRate;
        return total + revenue;
      }, 0);
      
      // Calculate hours worked
      const totalHours = minutesToHours(userEntries.reduce((total, entry) => total + entry.duration, 0));
      
      // Calculate cost with pro-rating for monthly employees
      const totalCost = calculateProRatedCost(user, totalHours, dateRange);
      
      // Calculate profit
      const profit = totalRevenue - totalCost;
      
      return {
        userId: user.id,
        name: user.name,
        totalHours,
        billingType: user.billingType || 'hourly',
        hourlyRate: user.hourlyRate,
        monthlyRate: user.monthlyRate,
        totalRevenue,
        totalCost,
        profit,
      };
    });
    
    return revenueByUser.sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by highest revenue first
  };

  // Get team efficiency
  const getTeamEfficiency = () => {
    return teams.map(team => {
      const teamMembers = users.filter(user => 
        user.teamIds?.includes(team.id)
      );
      
      const teamHours = timeEntries
        .filter(entry => teamMembers.some(member => member.id === entry.userId))
        .reduce((sum, entry) => sum + entry.duration, 0);

      return {
        name: team.name,
        hours: teamHours / 60,
        members: teamMembers.length,
        efficiency: teamMembers.length > 0 ? (teamHours / 60) / teamMembers.length : 0
      };
    });
  };

  // Get projects by team
  const getProjectsByTeam = () => {
    return teams.map(team => {
      const teamProjects = projects.filter(project => 
        project.teamIds?.includes(team.id)
      );
      
      return {
        team: team.name,
        projects: teamProjects.length,
        members: users.filter(user => 
          user.teamIds?.includes(team.id)
        ).length
      };
    });
  };

  // Get expenses by category
  const expensesByCategory = purchases.reduce((acc, purchase) => {
    const category = purchase.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + purchase.amount;
    return acc;
  }, {} as Record<string, number>);

  // Process all data
  const clientHoursData = getClientHoursData();
  const userHoursData = getUserHoursData();
  const projectProgressData = getProjectProgressData();
  const clientRevenueData = getClientRevenueData();
  const revenueByServiceType = getRevenueByServiceType();
  const monthlyRevenueData = getMonthlyRevenueData();
  const totalRevenue = calculateTotalRevenue();
  const teamRevenueData = getTeamRevenueData();
  const teamCostRevenueData = getTeamCostVsRevenueData();
  
  const toggleClientExpand = (clientId: string) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const toggleUserClientExpand = (key: string) => {
    setExpandedUserClients(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleUserClientProjectExpand = (key: string) => {
    setExpandedUserClientProjects(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleTeamExpand = (teamId: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  // Format currency based on currency code
  const formatCurrency = (amount: number | string, currencyCode: string = 'USD') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return formatter.format(numAmount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and view project reports
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-full md:w-60">
            <Select onValueChange={setReportType} defaultValue={reportType}>
              <SelectTrigger>
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Time Reports</SelectItem>
                <SelectItem value="progress">Project Progress</SelectItem>
                <SelectItem value="financial">Financial Reports</SelectItem>
                <SelectItem value="team">Team Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !dateRange.from && !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMMM d, yyyy")
                  )
                ) : dateRange.to ? (
                  format(dateRange.to, "MMMM d, yyyy")
                ) : (
                  "Select date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  if (range?.from) {
                    setDateRange({
                      from: range.from,
                      to: range.to || range.from
                    });
                  } else {
                    setDateRange({ from: undefined, to: undefined });
                  }
                }}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            toast({
              title: "Reports Exported",
              description: "Reports have been exported to CSV"
            });
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Reports
        </Button>
      </div>
      
      <FilterBar filters={filterOptions} onFilterChange={handleFilterChange} />
      
      {reportType === "time" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Hours by Client</CardTitle>
              <CardDescription>
                Click on a client to see projects breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientHoursData.length > 0 ? (
                    clientHoursData.map((client) => (
                      <>
                        <TableRow 
                          key={client.clientId}
                          className="cursor-pointer hover:bg-muted/80"
                          onClick={() => toggleClientExpand(client.clientId)}
                        >
                          <TableCell className="p-2 pl-4">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {expandedClients[client.clientId] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell className="text-right font-medium">{client.hours}h</TableCell>
                        </TableRow>
                        
                        {expandedClients[client.clientId] && (
                          getProjectHoursByClient(client.clientId).map((project) => (
                            <TableRow key={`${client.clientId}-${project.projectId}`} className="bg-muted/40">
                              <TableCell></TableCell>
                              <TableCell className="pl-10">{project.name}</TableCell>
                              <TableCell className="text-right">{project.hours}h</TableCell>
                            </TableRow>
                          ))
                        )}
                      </>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No data available for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hours by Team Member</CardTitle>
              <CardDescription>
                Click on team members to explore their time breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userHoursData.length > 0 ? (
                    userHoursData.map((user) => (
                      <>
                        <TableRow 
                          key={user.userId}
                          className="cursor-pointer hover:bg-muted/80"
                          onClick={() => toggleUserExpand(user.userId)}
                        >
                          <TableCell className="p-2 pl-4">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {expandedUsers[user.userId] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-right font-medium">{user.hours}h</TableCell>
                        </TableRow>
                        
                        {expandedUsers[user.userId] && (
                          getClientHoursByUser(user.userId).map((client) => client && (
                            <>
                              <TableRow 
                                key={`${user.userId}-${client.clientId}`} 
                                className="bg-muted/30 cursor-pointer hover:bg-muted/40"
                                onClick={() => toggleUserClientExpand(`${user.userId}-${client.clientId}`)}
                              >
                                <TableCell></TableCell>
                                <TableCell className="pl-10">
                                  <div className="flex items-center">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 mr-2">
                                      {expandedUserClients[`${user.userId}-${client.clientId}`] ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                    {client.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{client.hours}h</TableCell>
                              </TableRow>
                              
                              {expandedUserClients[`${user.userId}-${client.clientId}`] && (
                                getProjectHoursByUserAndClient(user.userId, client.clientId).map((project) => project && (
                                  <>
                                    <TableRow 
                                      key={`${user.userId}-${client.clientId}-${project.projectId}`}
                                      className="bg-muted/20 cursor-pointer hover:bg-muted/30"
                                      onClick={() => toggleUserClientProjectExpand(`${user.userId}-${client.clientId}-${project.projectId}`)}
                                    >
                                      <TableCell></TableCell>
                                      <TableCell className="pl-16">
                                        <div className="flex items-center">
                                          <Button variant="ghost" size="icon" className="h-6 w-6 mr-2">
                                            {expandedUserClientProjects[`${user.userId}-${client.clientId}-${project.projectId}`] ? (
                                              <ChevronDown className="h-4 w-4" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4" />
                                            )}
                                          </Button>
                                          {project.name}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">{project.hours}h</TableCell>
                                    </TableRow>
                                    
                                    {expandedUserClientProjects[`${user.userId}-${client.clientId}-${project.projectId}`] && (
                                      getTaskHoursByUserClientAndProject(user.userId, client.clientId, project.projectId).map((task) => task && (
                                        <TableRow 
                                          key={`${user.userId}-${client.clientId}-${project.projectId}-${task.taskId}`}
                                          className="bg-muted/10"
                                        >
                                          <TableCell></TableCell>
                                          <TableCell className="pl-24">{task.name}</TableCell>
                                          <TableCell className="text-right">{task.hours}h</TableCell>
                                        </TableRow>
                                      ))
                                    )}
                                  </>
                                ))
                              )}
                            </>
                          ))
                        )}
                      </>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No data available for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      
      {reportType === "progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
            <CardDescription>
              Status of active projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Hours Used</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectProgressData.length > 0 ? (
                  projectProgressData.map((item) => (
                    <TableRow key={item.project.id}>
                      <TableCell className="font-medium">{item.project.name}</TableCell>
                      <TableCell>{item.client?.name || "N/A"}</TableCell>
                      <TableCell>{item.completedTasks} / {item.totalTasks}</TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <div className="text-sm">
                            {item.hoursUsed}h / {item.allocatedHours}h
                          </div>
                          <Progress value={item.hoursPercentage} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end space-y-1">
                          <span>{item.completionPercentage}%</span>
                          <Progress value={item.completionPercentage} className="h-2 w-24" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No active projects found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {reportType === "financial" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-6 w-6 text-primary" />
                  <span className="text-2xl font-bold">
                    {formatCurrency(totalRevenue)}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <TrendingUp className="mr-2 h-6 w-6 text-primary" />
                  <span className="text-lg font-medium">
                    Last 6 Months
                  </span>
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  {monthlyRevenueData.map((month, i) => (
                    <div 
                      key={i} 
                      className="flex flex-col items-center text-xs"
                    >
                      <div 
                        className="bg-primary/90 w-6 rounded-t-sm" 
                        style={{ 
                          height: `${Math.max(15, Math.min(80, parseFloat(month.amount) / 100))}px` 
                        }}
                      ></div>
                      <span className="mt-1">{month.month.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Revenue by Service Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-2">
                  <ChartPie className="mr-2 h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Distribution</span>
                </div>
                {revenueByServiceType.map((item, i) => (
                  <div key={i} className="mt-1 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.type}</span>
                      <span className="font-medium">{item.percentage}%</span>
                    </div>
                    <Progress value={parseFloat(item.percentage)} className="h-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Client</CardTitle>
              <CardDescription>
                Detailed breakdown of revenue from each client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientRevenueData.length > 0 ? (
                    clientRevenueData.map((client) => (
                      <TableRow key={client.clientId}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(client.revenue, client.currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-10 text-muted-foreground">
                        No revenue data available for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(totalRevenue)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      
      {reportType === "team" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Team</CardTitle>
              <CardDescription>
                Revenue generated by each team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Billable Hours</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamRevenueData.length > 0 ? (
                    teamRevenueData.map((team) => (
                      <TableRow 
                        key={team.teamId}
                        className="cursor-pointer hover:bg-muted/80"
                        onClick={() => toggleTeamExpand(team.teamId)}
                      >
                        <TableCell className="p-2 pl-4">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {expandedTeams[team.teamId] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{team.memberCount}</TableCell>
                        <TableCell>{team.billableHours}h</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(team.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No team data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Team Cost vs Revenue</CardTitle>
              <CardDescription>
                Cost and revenue breakdown per team (monthly employees are pro-rated based on date range)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead className="text-right">Profit/Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamCostRevenueData.length > 0 ? (
                    teamCostRevenueData.map((team) => (
                      <>
                        <TableRow 
                          key={team.teamId}
                          className="cursor-pointer hover:bg-muted/80"
                          onClick={() => toggleTeamExpand(team.teamId)}
                        >
                          <TableCell className="p-2 pl-4">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {expandedTeams[team.teamId] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell>{team.totalHours.toFixed(1)}h</TableCell>
                          <TableCell>{formatCurrency(team.totalCost)}</TableCell>
                          <TableCell>{formatCurrency(team.totalRevenue)}</TableCell>
                          <TableCell 
                            className={cn(
                              "text-right font-medium",
                              team.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {formatCurrency(team.totalProfit)}
                          </TableCell>
                        </TableRow>
                        
                        {expandedTeams[team.teamId] && team.members.map((member) => (
                          <TableRow key={`${team.teamId}-${member.userId}`} className="bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell className="pl-10">
                              {member.name}
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({member.billingType === 'monthly' ? 'Monthly rate' : 'Hourly rate'})
                              </span>
                            </TableCell>
                            <TableCell>{member.hoursWorked.toFixed(1)}h</TableCell>
                            <TableCell>{formatCurrency(member.totalCost)}</TableCell>
                            <TableCell>{formatCurrency(member.totalRevenue)}</TableCell>
                            <TableCell 
                              className={cn(
                                "text-right",
                                member.profit >= 0 ? "text-green-600" : "text-red-600"
                              )}
                            >
                              {formatCurrency(member.profit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No team cost vs revenue data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;
