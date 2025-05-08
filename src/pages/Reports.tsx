
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

const Reports = () => {
  const { toast } = useToast();
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
          <CardTitle>Time Reports</CardTitle>
          <CardDescription>
            View your time tracking data by client, project, or team member
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-80">
          <p className="text-muted-foreground">
            Select filters above to view reports
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
