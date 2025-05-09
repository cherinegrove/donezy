
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { format, isWithinInterval, parseISO } from "date-fns";
import { CalendarIcon, Download, ChevronRight, ChevronDown } from "lucide-react";
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
} from "@/components/ui/table";
import { Client, TimeEntry, Project } from "@/types";

// Helper function to calculate total hours from minutes
const minutesToHours = (minutes: number) => {
  return +(minutes / 60).toFixed(1);
};

const Reports = () => {
  const { toast } = useToast();
  const { timeEntries, clients, projects } = useAppContext();
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

  const clientHoursData = getClientHoursData();
  
  const toggleClientExpand = (clientId: string) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
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
    </div>
  );
};

export default Reports;
