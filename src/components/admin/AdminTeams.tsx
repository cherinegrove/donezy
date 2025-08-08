
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditTeamDialog } from "@/components/teams/EditTeamDialog";
import { CreateTeamCard } from "@/components/teams/CreateTeamCard";

export default function AdminTeams() {
  const { teams } = useAppContext();
  const [editTeamDialogOpen, setEditTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setEditTeamDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <CreateTeamCard />
      
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center border rounded-lg overflow-hidden">
                {/* Color block on the left */}
                <div 
                  className="w-1 h-full min-h-[80px]"
                  style={{ backgroundColor: team.color || '#3b82f6' }}
                />
                <div className="flex items-center justify-between p-4 flex-1">
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
