import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { User } from "@/types";
import { Building, Pencil, Plus, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamMemberInviteForm } from "@/components/settings/TeamMemberInviteForm";
import { ClientUserInviteForm } from "@/components/settings/ClientUserInviteForm";

interface UsersManagementTabProps {
  showTeamSection?: boolean;
  showClientSection?: boolean;
  defaultTab?: 'team' | 'client';
}

export function UsersManagementTab({ 
  showTeamSection = true, 
  showClientSection = true,
  defaultTab = 'team'
}: UsersManagementTabProps) {
  const { teams, users, clients } = useAppContext();
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<'team' | 'client'>(defaultTab);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);

  // Define filter options - create separate arrays for different tabs
  const teamFilterOptions: FilterOption[] = [
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
  
  const clientFilterOptions: FilterOption[] = [
    {
      id: "clients",
      name: "Client",
      options: clients.map(client => ({
        id: client.id,
        label: client.name,
      })),
    },
  ];

  const getUsersInTeam = (teamId: string) => {
    const filteredUsers = users.filter(user => user.teamIds.includes(teamId));
    
    // Apply role filters if any
    if (activeFilters.roles && activeFilters.roles.length > 0) {
      return filteredUsers.filter(user => 
        activeFilters.roles.includes(user.role)
      );
    }
    
    return filteredUsers;
  };

  // Filter users based on their type (internal or client)
  const teamUsers = users.filter(user => user.role !== "client");
  const clientUsers = users.filter(user => user.role === "client");

  // Apply client filter for client users
  const filteredClientUsers = activeFilters.clients && activeFilters.clients.length > 0
    ? clientUsers.filter(user => {
        return user.clientId && activeFilters.clients.includes(user.clientId);
      })
    : clientUsers;

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserDialogOpen(true);
  };

  // Filter teams based on team filter
  const filteredTeams = teams.filter(team => {
    if (activeFilters.teams && activeFilters.teams.length > 0) {
      return activeFilters.teams.includes(team.id);
    }
    return true;
  });

  // If both sections are hidden, return nothing
  if (!showTeamSection && !showClientSection) {
    return null;
  }

  // If only one section is shown, don't show tabs
  if (showTeamSection && !showClientSection) {
    return renderTeamSection();
  }

  if (showClientSection && !showTeamSection) {
    return renderClientSection();
  }

  function renderTeamSection() {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowTeamForm(!showTeamForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </div>
        
        {showTeamForm && (
          <Card>
            <CardContent className="pt-6">
              <TeamMemberInviteForm onSuccess={() => setShowTeamForm(false)} />
            </CardContent>
          </Card>
        )}
        
        <FilterBar filters={teamFilterOptions} onFilterChange={handleFilterChange} />

        <div className="space-y-6">
          {filteredTeams.map((team) => {
            const teamMembers = getUsersInTeam(team.id).filter(user => user.role !== "client");
            
            return (
              <Card key={team.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {team.description}
                    </p>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Team Members</h3>
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
                                {member.phone && (
                                  <p className="text-xs text-muted-foreground">{member.phone}</p>
                                )}
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  function renderClientSection() {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowClientForm(!showClientForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client User
          </Button>
        </div>
        
        {showClientForm && (
          <Card>
            <CardContent className="pt-6">
              <ClientUserInviteForm onSuccess={() => setShowClientForm(false)} />
            </CardContent>
          </Card>
        )}
        
        <FilterBar filters={clientFilterOptions} onFilterChange={handleFilterChange} />

        <div className="space-y-2">
          {filteredClientUsers.map(user => {
            const client = clients.find(c => c.id === user.clientId);
            return (
              <div 
                key={user.id} 
                className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {client && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Associated with: {client.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Client
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditUser(user)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </div>
              </div>
            );
          })}

          {filteredClientUsers.length === 0 && (
            <div className="text-center py-10">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No client users found with the selected filters
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'team' | 'client')}>
        <TabsList>
          {showTeamSection && <TabsTrigger value="team">Team Members</TabsTrigger>}
          {showClientSection && <TabsTrigger value="client">Client Users</TabsTrigger>}
        </TabsList>
        
        {showTeamSection && (
          <TabsContent value="team" className="space-y-6">
            {renderTeamSection()}
          </TabsContent>
        )}
        
        {showClientSection && (
          <TabsContent value="client" className="space-y-6">
            {renderClientSection()}
          </TabsContent>
        )}
      </Tabs>

      <EditUserDialog
        user={selectedUser}
        isOpen={isEditUserDialogOpen}
        onClose={() => setIsEditUserDialogOpen(false)}
      />
    </div>
  );
}
