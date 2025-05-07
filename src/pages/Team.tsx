
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Team = () => {
  const { teams, users } = useAppContext();

  const getUsersInTeam = (teamId: string) => {
    return users.filter(user => user.teamIds.includes(teamId));
  };

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
          <Button variant="outline">Add Team Member</Button>
          <Button>Create Team</Button>
        </div>
      </div>

      <div className="space-y-6">
        {teams.map((team) => {
          const teamMembers = getUsersInTeam(team.id);
          
          return (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                                {member.name.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                              {member.role}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Team;
