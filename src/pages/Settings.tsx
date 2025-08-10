
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Team } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditTeamDialog } from "@/components/teams/EditTeamDialog";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { UsersManagementTab } from "@/components/settings/UsersManagementTab";

export default function Settings() {
  const { teams, currentUser, customRoles } = useAppContext();
  const [editTeamDialogOpen, setEditTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setEditTeamDialogOpen(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          {currentUser && customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin' && (
            <TabsTrigger value="users">Users</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {team.memberIds.length} members
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTeam(team)}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {currentUser && customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin' && (
          <TabsContent value="users">
            <UsersManagementTab />
          </TabsContent>
        )}
      </Tabs>

      {selectedTeam && (
        <EditTeamDialog
          team={selectedTeam}
          open={editTeamDialogOpen}
          onClose={() => {
            setEditTeamDialogOpen(false);
            setSelectedTeam(null);
          }}
        />
      )}
    </div>
  );
}
