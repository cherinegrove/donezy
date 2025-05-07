
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const { clients, projects, tasks, timeEntries, users } = useAppContext();
  const [reportType, setReportType] = useState("time");
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("month");
  const { toast } = useToast();
  
  const generateReport = (type: string) => {
    toast({
      title: "Generating Report",
      description: `Your ${type} report is being generated.`
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and view project reports
        </p>
      </div>
      
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
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
        
        <div className="w-full md:w-60">
          <Select onValueChange={value => setClientFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Clients</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-60">
          <Select onValueChange={setDateRange} defaultValue={dateRange}>
            <SelectTrigger>
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {dateRange === "custom" && (
          <div className="flex items-center space-x-2">
            <Input type="date" className="w-full md:w-40" />
            <span>to</span>
            <Input type="date" className="w-full md:w-40" />
          </div>
        )}
      </div>
      
      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="reports">Report Gallery</TabsTrigger>
          <TabsTrigger value="time">Time Details</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Time Reports</CardTitle>
                <CardDescription>
                  Track time spent by project, team member, or task
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button onClick={() => generateReport("time")}>Generate Report</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Project Progress</CardTitle>
                <CardDescription>
                  Analyze project completion and milestone status
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button onClick={() => generateReport("progress")}>Generate Report</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Financial Reports</CardTitle>
                <CardDescription>
                  Review billable hours and client billing
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button onClick={() => generateReport("financial")}>Generate Report</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Team Performance</CardTitle>
                <CardDescription>
                  Assess team workload and productivity
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button onClick={() => generateReport("team")}>Generate Report</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="time" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Tracking Details</CardTitle>
              <CardDescription>
                Detailed breakdown of time entries by project, client, and team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Select report parameters and click Generate Report to view time tracking details
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Reports</CardTitle>
              <CardDescription>
                Generate invoices and view client billing summaries 
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.map(client => {
                  const clientProjects = projects.filter(p => p.clientId === client.id);
                  const totalHours = clientProjects.reduce((sum, p) => sum + p.usedHours, 0);
                  const billableAmount = totalHours * (client.billableRate || 0);
                  
                  return (
                    <div key={client.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <h3 className="font-medium">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {clientProjects.length} projects, {totalHours.toFixed(1)} hours
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {client.currency} {billableAmount.toFixed(2)}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-1"
                          onClick={() => toast({
                            title: "Invoice Generated",
                            description: `Invoice for ${client.name} has been created`
                          })}
                        >
                          Generate Invoice
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {clients.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">
                    No clients available for billing reports
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="custom" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Reports</CardTitle>
              <CardDescription>
                Create custom reports with the exact data you need
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="py-8 max-w-md mx-auto">
                <p className="text-muted-foreground mb-6">
                  Need a specific report? Create a custom report with the exact data you need.
                </p>
                <Button onClick={() => generateReport("custom")}>Create Custom Report</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
