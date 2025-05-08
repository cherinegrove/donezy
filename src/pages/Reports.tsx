
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { format } from "date-fns";
import { CalendarIcon, Download } from "lucide-react";
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, XAxis, YAxis, Bar, Tooltip, ResponsiveContainer } from "recharts";
import { Client, TimeEntry } from "@/types";

// Helper function to calculate total hours from minutes
const minutesToHours = (minutes: number) => {
  return +(minutes / 60).toFixed(1);
};

const Reports = () => {
  const { toast } = useToast();
  const { timeEntries, clients } = useAppContext();
  const [reportType, setReportType] = useState("time");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  
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

  // Process data for the client hours report
  const getClientHoursData = () => {
    // Group time entries by client
    const hoursByClient = timeEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
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

  const clientHoursData = getClientHoursData();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and view project reports
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
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
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "MMMM yyyy") : "Select month"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
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
            Total hours tracked per client across all projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientHoursData.length > 0 ? (
            <div className="w-full h-80">
              <ChartContainer
                config={{
                  hours: {
                    theme: {
                      light: "#2563eb",
                      dark: "#3b82f6",
                    },
                    label: "Hours",
                  },
                }}
              >
                <BarChart data={clientHoursData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    tick={{fontSize: 12}} 
                  />
                  <YAxis 
                    tick={{fontSize: 12}}
                    tickFormatter={(value) => `${value}h`} 
                  />
                  <Bar dataKey="hours" name="Hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
                  <ChartTooltip content={<ChartTooltipContent labelKey="name" />} />
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-60">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
          
          {/* Add a table below the chart for detailed information */}
          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientHoursData.map((client) => (
                  <TableRow key={client.clientId}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell className="text-right font-medium">{client.hours}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
