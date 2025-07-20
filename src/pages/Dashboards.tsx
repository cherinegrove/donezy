import { useAppContext } from "@/contexts/AppContext";
import { CustomDashboardManager } from "@/components/dashboard/CustomDashboardManager";
import { useToast } from "@/hooks/use-toast";

const Dashboards = () => {
  const {
    customDashboards,
    savedReports,
    addCustomDashboard,
    deleteCustomDashboard,
    setDefaultDashboard
  } = useAppContext();
  const { toast } = useToast();

  const handleCreateDashboard = (dashboardData: any) => {
    addCustomDashboard(dashboardData);
    toast({
      title: "Dashboard created",
      description: `Dashboard "${dashboardData.name}" has been created successfully.`,
    });
  };

  const handleDeleteDashboard = (dashboardId: string) => {
    const dashboard = customDashboards.find(d => d.id === dashboardId);
    if (dashboard) {
      deleteCustomDashboard(dashboardId);
      toast({
        title: "Dashboard deleted",
        description: `Dashboard "${dashboard.name}" has been deleted.`,
      });
    }
  };

  const handleSetDefaultDashboard = (dashboardId: string) => {
    const dashboard = customDashboards.find(d => d.id === dashboardId);
    if (dashboard) {
      setDefaultDashboard(dashboardId);
      toast({
        title: "Default dashboard updated",
        description: `Dashboard "${dashboard.name}" is now your default dashboard.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Custom Dashboards</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage custom dashboards with your saved reports
        </p>
      </div>

      <CustomDashboardManager
        dashboards={customDashboards}
        savedReports={savedReports}
        onCreateDashboard={handleCreateDashboard}
        onDeleteDashboard={handleDeleteDashboard}
        onSetDefaultDashboard={handleSetDefaultDashboard}
      />
    </div>
  );
};

export default Dashboards;