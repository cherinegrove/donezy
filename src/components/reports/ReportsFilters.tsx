import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface ReportsFiltersProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  selectedClient: string;
  selectedProject: string;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onClientChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  clients: Client[];
  projects: Project[];
}

export function ReportsFilters({
  startDate,
  endDate,
  selectedClient,
  selectedProject,
  onStartDateChange,
  onEndDateChange,
  onClientChange,
  onProjectChange,
  clients,
  projects
}: ReportsFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>All dates</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={onStartDateChange}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {startDate && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onStartDateChange(undefined)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>All dates</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={onEndDateChange}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {endDate && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onEndDateChange(undefined)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Client</label>
            <Select value={selectedClient} onValueChange={onClientChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Project</label>
            <Select value={selectedProject} onValueChange={onProjectChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}