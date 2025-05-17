
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanCustomizationCard } from "@/components/settings/KanbanCustomizationCard";
import { useAppContext } from "@/contexts/AppContext";
import { UsersManagementTab } from "@/components/settings/UsersManagementTab";
import { Button } from "@/components/ui/button";
import { Plus, Palette, Shield, Users, Pencil } from "lucide-react";
import { EditTeamDialog } from "@/components/teams/EditTeamDialog";
import { CompanyThemeSettings } from "@/components/settings/CompanyThemeSettings";
import { RoleManagementTab } from "@/components/settings/RoleManagementTab";
import { Team } from "@/types";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("account");
  const [activeAccountTab, setActiveAccountTab] = useState("setup");
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | undefined>(undefined);
  const { currentUser, teams } = useAppContext();
  const isClient = currentUser?.role === 'client';
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamDialogOpen(true);
  };
  
  const handleCreateTeam = () => {
    setSelectedTeam(undefined);
    setIsTeamDialogOpen(true);
  };
  
  const handleCloseTeamDialog = () => {
    setIsTeamDialogOpen(false);
    setSelectedTeam(undefined);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization's account settings
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="account">Account Setup</TabsTrigger>
          <TabsTrigger value="team">Team Members</TabsTrigger>
          <TabsTrigger value="client">Client Users</TabsTrigger>
        </TabsList>
        
        {/* Account Setup Tab */}
        <TabsContent value="account" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Setup</CardTitle>
              <CardDescription>
                Configure key aspects of your organization's account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Roles Management */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">Role Management</CardTitle>
                      <CardDescription>
                        Create and manage custom roles with specific permissions
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <RoleManagementTab />
                </CardContent>
              </Card>
              
              {/* Teams Management */}
              {!isClient && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">Teams Management</CardTitle>
                        <CardDescription>
                          Manage teams and set member permissions
                        </CardDescription>
                      </div>
                    </div>
                    <Button onClick={handleCreateTeam}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Team
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {teams.length > 0 ? (
                      <div className="space-y-3">
                        {teams.map((team) => (
                          <div 
                            key={team.id}
                            className="flex items-center justify-between p-3 rounded-md border"
                          >
                            <div>
                              <h3 className="font-medium">{team.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {team.description || "No description"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {team.members.length} members
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditTeam(team)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-12 text-muted-foreground">
                        Create a team to organize your team members
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Company Theme Settings */}
              <CompanyThemeSettings />
              
              {/* Kanban Customization */}
              <KanbanCustomizationCard />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Team Members Tab */}
        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Team Members</CardTitle>
              </div>
              <CardDescription>
                Manage all team members and their access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersManagementTab showClientSection={false} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Client Users Tab */}
        <TabsContent value="client" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Client Users</CardTitle>
              </div>
              <CardDescription>
                Manage client users and their access to projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersManagementTab showTeamSection={false} defaultTab="client" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Team Dialog (Edit or Create) */}
      <EditTeamDialog 
        team={selectedTeam}
        isOpen={isTeamDialogOpen}
        onClose={handleCloseTeamDialog}
      />
    </div>
  );
};

export default Settings;
