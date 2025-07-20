import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomDashboard } from "@/types/dashboard";

interface SaveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveReport: (reportName: string, dashboardId: string) => void;
  dashboards: CustomDashboard[];
  defaultReportName?: string;
}

export function SaveReportDialog({
  open,
  onOpenChange,
  onSaveReport,
  dashboards,
  defaultReportName = ""
}: SaveReportDialogProps) {
  const [reportName, setReportName] = useState(defaultReportName);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>(
    dashboards.find(d => d.isDefault)?.id || dashboards[0]?.id || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim() || !selectedDashboardId) return;

    onSaveReport(reportName.trim(), selectedDashboardId);
    setReportName("");
    onOpenChange(false);
  };

  // Update report name when defaultReportName changes
  useState(() => {
    setReportName(defaultReportName);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Report to Dashboard</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reportName">Report Name</Label>
              <Input
                id="reportName"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter report name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dashboard">Save to Dashboard</Label>
              <Select
                value={selectedDashboardId}
                onValueChange={setSelectedDashboardId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dashboard" />
                </SelectTrigger>
                <SelectContent>
                  {dashboards.map((dashboard) => (
                    <SelectItem key={dashboard.id} value={dashboard.id}>
                      {dashboard.name} {dashboard.isDefault && "(Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dashboards.length === 0 && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                No dashboards available. You'll need to create a dashboard first.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={dashboards.length === 0}>
              Save Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}