import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, BarChart3, Star } from "lucide-react";
import { CustomDashboard, SavedReport } from "@/types/dashboard";
import { CreateDashboardDialog } from "./CreateDashboardDialog";
import { CustomReportVisualization } from "../reports/CustomReportVisualization";

interface CustomDashboardManagerProps {
  dashboards: CustomDashboard[];
  savedReports: SavedReport[];
  onCreateDashboard: (dashboard: Omit<CustomDashboard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteDashboard: (dashboardId: string) => void;
  onSetDefaultDashboard: (dashboardId: string) => void;
}

export function CustomDashboardManager({
  dashboards,
  savedReports,
  onCreateDashboard,
  onDeleteDashboard,
  onSetDefaultDashboard
}: CustomDashboardManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<CustomDashboard | null>(
    dashboards.find(d => d.isDefault) || dashboards[0] || null
  );

  const getDashboardReports = (dashboard: CustomDashboard) => {
    return dashboard.reportIds
      .map(reportId => savedReports.find(r => r.id === reportId))
      .filter(Boolean) as SavedReport[];
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Selector and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Custom Dashboards</CardTitle>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dashboards.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Custom Dashboards</h3>
              <p className="text-muted-foreground mb-4">
                Create your first custom dashboard to organize your reports
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Dashboard
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboards.map((dashboard) => (
                <Card 
                  key={dashboard.id}
                  className={`cursor-pointer transition-colors ${
                    selectedDashboard?.id === dashboard.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedDashboard(dashboard)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                          {dashboard.name}
                          {dashboard.isDefault && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </CardTitle>
                        {dashboard.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {dashboard.description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSetDefaultDashboard(dashboard.id)}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Dashboard
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => onDeleteDashboard(dashboard.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Dashboard
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {dashboard.reportIds.length} reports
                      </span>
                      {dashboard.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Content */}
      {selectedDashboard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedDashboard.name}
              {selectedDashboard.isDefault && (
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
              )}
            </CardTitle>
            {selectedDashboard.description && (
              <p className="text-muted-foreground">{selectedDashboard.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {getDashboardReports(selectedDashboard).length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-medium mb-2">No Reports Added</h4>
                <p className="text-sm text-muted-foreground">
                  Go to Custom Reports to create and save reports to this dashboard
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {getDashboardReports(selectedDashboard).map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{report.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CustomReportVisualization 
                        config={report.reportConfig} 
                        data={report.reportData} 
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <CreateDashboardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateDashboard={onCreateDashboard}
      />
    </div>
  );
}