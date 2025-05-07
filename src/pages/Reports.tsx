
import { Button } from "@/components/ui/button";

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and view project reports
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Time Reports</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Track time spent by project, team member, or task
          </p>
          <Button>Generate Report</Button>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Project Progress</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Analyze project completion and milestone status
          </p>
          <Button>Generate Report</Button>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Financial Reports</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Review billable hours and client billing
          </p>
          <Button>Generate Report</Button>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Team Performance</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Assess team workload and productivity
          </p>
          <Button>Generate Report</Button>
        </div>
      </div>
      
      <div className="border rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Custom Reports</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Need a specific report? Create a custom report with the exact data you need.
        </p>
        <Button>Create Custom Report</Button>
      </div>
    </div>
  );
};

export default Reports;
