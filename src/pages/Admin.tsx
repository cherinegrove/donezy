import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminActivity from "@/components/admin/AdminActivity";
import AdminTeams from "@/components/admin/AdminTeams";
import AdminRoles from "@/components/admin/AdminRoles";
import { TaskStatusManager } from "@/components/admin/TaskStatusManager";
import { TaskTemplateManager } from "@/components/admin/TaskTemplateManager";
import { ProjectStatusManager } from "@/components/admin/ProjectStatusManager";
import { CustomFieldsManager } from "@/components/admin/CustomFieldsManager";
import { NativeFieldsManager } from "@/components/admin/NativeFieldsManager";
import { SubscriptionManager } from "@/components/admin/SubscriptionManager";
import { DataImportManager } from "@/components/admin/DataImportManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, BarChart3, Box, Database, Settings, ShieldAlert, Users, CheckSquare, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Clients from "@/pages/Clients";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SystemPreferences } from "@/components/admin/SystemPreferences";
import { isAdmin } from "@/utils/roleUtils";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { currentUser, users, customRoles } = useAppContext();

  // Allow admin access for demo purposes - remove this in production
  const allowAdminAccess = true; // Set to false in production
  
  if (!allowAdminAccess && !isAdmin(currentUser, customRoles)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to access the admin section.
          </p>
        </div>
      </div>
    );
  }

  // Calculate seat usage for dashboard
  const totalSeats = 10; // This would come from subscription data
  const usedSeats = users.length;
  const seatUsagePercentage = (usedSeats / totalSeats) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, teams, and monitor system activity</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="data-import">Data Import</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="account-roles">Account Roles</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="account-settings">Account Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{users.length}</div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {usedSeats} of {totalSeats} seats used
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Seat Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{Math.round(seatUsagePercentage)}%</div>
                  <Box className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {seatUsagePercentage >= 80 ? "Near capacity" : "Available capacity"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Healthy</Badge>
                  </div>
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">100% uptime last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">68%</div>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">5.4GB of 8GB</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AreaChart className="h-5 w-5 text-primary" />
                  User Activity
                </CardTitle>
                <CardDescription>User logins over the past 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/40">
                  <p className="text-muted-foreground text-sm">User activity chart placeholder</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Resource Usage
                </CardTitle>
                <CardDescription>System resource allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/40">
                  <p className="text-muted-foreground text-sm">Resource usage chart placeholder</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="data-import" className="space-y-6">
          <DataImportManager />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <SubscriptionManager />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Clients />
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <AdminTeams />
        </TabsContent>

        <TabsContent value="account-roles" className="space-y-6">
          <AdminRoles />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <AdminActivity />
        </TabsContent>

        <TabsContent value="account-settings" className="space-y-6">
          <div className="space-y-6">
            <Accordion type="multiple" defaultValue={["task-management", "project-management", "account-settings"]} className="space-y-4">
              
              {/* Task Management Section */}
              <AccordionItem value="task-management" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <h3 className="font-semibold">Task Management</h3>
                      <p className="text-sm text-muted-foreground">Configure task statuses, templates, and custom fields</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    <TaskStatusManager />
                    <TaskTemplateManager />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Project Management Section */}
              <AccordionItem value="project-management" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <h3 className="font-semibold">Project Management</h3>
                      <p className="text-sm text-muted-foreground">Configure project statuses and settings</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    <ProjectStatusManager />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Account Settings Section */}
              <AccordionItem value="account-settings" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <h3 className="font-semibold">Account Settings</h3>
                      <p className="text-sm text-muted-foreground">Manage custom fields and global system settings</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    <CustomFieldsManager />
                    <NativeFieldsManager />
                    <SystemPreferences />
                  </div>
                </AccordionContent>
              </AccordionItem>
              
            </Accordion>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;