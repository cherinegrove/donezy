
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminActivity from "@/components/admin/AdminActivity";
import AdminTeams from "@/components/admin/AdminTeams";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("users");
  const { currentUser } = useAppContext();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, teams, and monitor activity</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <AdminTeams />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <AdminActivity />
        </TabsContent>
      </Tabs>
    </div>
  );
}
