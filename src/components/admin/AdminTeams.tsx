import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditTeamDialog } from "@/components/teams/EditTeamDialog";

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
