
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface ClientDashboardProps {
  clientId: string;
}

export const ClientDashboard = ({ clientId }: ClientDashboardProps) => {
  const { projects, getClientById } = useAppContext();
  
  const client = getClientById(clientId);
  const clientProjects = projects.filter(project => project.clientId === clientId);
  
  // Calculate total hours and cost based on billable rate
  const totalHours = clientProjects.reduce((sum, project) => sum + project.usedHours, 0);
  const billableRate = client?.billableRate || 0;
  const currency = client?.currency || "USD";
  const totalCost = totalHours * billableRate;
  
  // Get current month for billing period display
  const currentMonth = format(new Date(), "MMMM yyyy");
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Client Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Track your projects and billing
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonth}</div>
            <p className="text-muted-foreground text-sm">Billing period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hours Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-muted-foreground text-sm">
              {billableRate > 0 ? `at ${currency} ${billableRate}/hour` : ""}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency} {totalCost.toFixed(2)}</div>
            <p className="text-muted-foreground text-sm">For this month</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientProjects.map(project => {
                const allocatedPercentage = project.allocatedHours 
                  ? (project.usedHours / project.allocatedHours) * 100
                  : 0;
                
                return (
                  <div key={project.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <a 
                          href={`/projects/${project.id}`} 
                          className="font-medium hover:underline"
                        >
                          {project.name}
                        </a>
                      </div>
                      <div className="text-sm">
                        {project.usedHours.toFixed(1)}h 
                        {project.allocatedHours ? ` / ${project.allocatedHours}h` : ""}
                      </div>
                    </div>
                    
                    {project.allocatedHours && (
                      <Progress 
                        value={allocatedPercentage > 100 ? 100 : allocatedPercentage} 
                        className="h-2"
                        // Show red for over-allocation
                        style={{
                          backgroundColor: allocatedPercentage > 90 ? 'rgba(239,68,68,0.2)' : undefined,
                        }}
                      />
                    )}
                  </div>
                );
              })}
              
              {clientProjects.length === 0 && (
                <p className="text-muted-foreground text-center py-6">
                  No projects found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
