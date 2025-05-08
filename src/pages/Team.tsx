
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { UserInviteForm } from "@/components/settings/UserInviteForm";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { EditTeamDialog } from "@/components/teams/EditTeamDialog";
import { Team as TeamType, User } from "@/types";
import { Pencil, Plus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Team = () => {
  const { teams, users } = useAppContext();
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamType | undefined>(undefined);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);

  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      id: "teams",
      name: "Team",
      options: teams.map(team => ({
        id: team.id,
        label: team.name,
      })),
    },
    {
      id: "roles",
      name: "Role",
      options: [
        { id: "admin", label: "Admin" },
        { id: "manager", label: "Manager" },
        { id: "developer", label: "Developer" },
      ],
    },
  ];

  const getUsersInTeam = (teamId: string) => {
    const filteredUsers = users.filter(user => 
      user.teamIds.includes(teamId) && user.role !== "client"
    );
    
    // Apply role filters if any
    if (activeFilters.roles && activeFilters.roles.length > 0) {
      return filteredUsers.filter(user => 
        activeFilters.roles.includes(user.role)
      );
    }
    
    return filteredUsers;
  };

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  const handleEditTeam = (team: TeamType) => {
    setSelectedTeam(team);
    setIsTeamDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserDialogOpen(true);
  };

  const handleCreateTeam = () => {
    setSelectedTeam(undefined);
    setIsTeamDialogOpen(true);
  };

  const handleAddTeamMember = () => {
    setSelectedUser(undefined);
    setIsEditUserDialogOpen(true);
  };

  // Filter teams based on team filter
  const filteredTeams = teams.filter(team => {
    if (activeFilters.teams && activeFilters.teams.length > 0) {
      return activeFilters.teams.includes(team.id);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage teams and team members
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddTeamMember}>
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
          <Button variant="outline" onClick={handleCreateTeam}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>
      </div>

      <FilterBar filters={filterOptions} onFilterChange={handleFilterChange} />

      <div className="space-y-6">
        {filteredTeams.map((team) => {
          const teamMembers = getUsersInTeam(team.id);
          
          return (
            <Card key={team.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{team.name}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleEditTeam(team)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Team
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {team.description}
                  </p>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">Team Members</h3>
                    </div>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div 
                          key={member.id} 
                          className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>
                                {member.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                              {member.employmentType && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {member.employmentType} • 
                                  {member.billingType === "hourly" 
                                    ? ` ${member.billingRate || 0} ${member.currency || "USD"}/hr` 
                                    : ` ${member.billingRate || 0} ${member.currency || "USD"}/month`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                              {member.role}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditUser(member)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </div>
                        </div>
                      ))}

                      {teamMembers.length === 0 && (
                        <p className="text-center py-4 text-muted-foreground">
                          No team members found with the selected filters
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredTeams.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No teams found</p>
              <Button variant="outline" className="mt-4" onClick={handleCreateTeam}>
                Create a Team
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite New Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to a new team member
            </DialogDescription>
          </DialogHeader>
          <UserInviteForm />
        </DialogContent>
      </Dialog>

      <EditTeamDialog 
        team={selectedTeam}
        isOpen={isTeamDialogOpen}
        onClose={() => setIsTeamDialogOpen(false)}
      />

      <EditUserDialog
        user={selectedUser}
        isOpen={isEditUserDialogOpen}
        onClose={() => setIsEditUserDialogOpen(false)}
      />
    </div>
  );
};

export default Team;
