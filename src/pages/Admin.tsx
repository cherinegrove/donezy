import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminActivity from "@/components/admin/AdminActivity";
import AdminTeams from "@/components/admin/AdminTeams";
import AdminRoles from "@/components/admin/AdminRoles";
import { TaskStatusManager } from "@/components/admin/TaskStatusManager";
import { SubscriptionManager } from "@/components/admin/SubscriptionManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, BarChart3, Box, Database, Download, Settings, ShieldAlert, Users, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Clients from "@/pages/Clients";
import { GuestManagement } from "@/components/admin/GuestManagement";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { currentUser, users } = useAppContext();

  // Only admin should access this page
  if (currentUser?.role !== "admin") {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, teams, and monitor system activity</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="guests">Guest Management</TabsTrigger>
          <TabsTrigger value="subscription">Subscription & Billing</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="account-settings">Account Settings</TabsTrigger>
        </TabsList>

        {/* Dashboard overview tab */}
        <TabsContent value="dashboard" className="space-y-6">
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

        <TabsContent value="guests" className="space-y-6">
          <GuestManagement />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionManager />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Clients />
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <AdminTeams />
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <AdminRoles />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <AdminActivity />
        </TabsContent>

        <TabsContent value="account-settings" className="space-y-6">
          <div className="space-y-6">
            <TaskStatusManager />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Account Settings
                </CardTitle>
                <CardDescription>Configure global account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <h3 className="font-medium">Maintenance Mode</h3>
                    <p className="text-sm text-muted-foreground">When enabled, only administrators can access the system.</p>
                    <div className="flex items-center justify-end">
                      <Button variant="outline">Enable Maintenance Mode</Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <h3 className="font-medium">Database Backup</h3>
                    <p className="text-sm text-muted-foreground">Create a full backup of all system data.</p>
                    <div className="flex items-center justify-end">
                      <Button variant="outline">Generate Backup</Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <h3 className="font-medium">System Cache</h3>
                    <p className="text-sm text-muted-foreground">Clear system cache to resolve potential issues.</p>
                    <div className="flex items-center justify-end">
                      <Button variant="outline">Clear Cache</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
