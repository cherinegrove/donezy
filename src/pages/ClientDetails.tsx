import { useParams } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectItem } from "@/components/projects/ProjectItem";

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const { clients, projects, timeEntries, users } = useAppContext();
  
  const client = clients.find(c => c.id === id);
  const clientProjects = projects.filter(p => p.clientId === id);
  
  // Remove reference to userId that doesn't exist on Client
  const clientMembers = users.filter(user => user.clientId === id);
  const totalHours = timeEntries
    .filter(entry => entry.clientId === id)
    .reduce((sum, entry) => sum + entry.duration, 0);

  return (
    <div className="p-6">
      <div className="flex items-center space-x-4 mb-6">
        <Avatar>
          <AvatarImage src={`https://avatar.vercel.sh/${client?.email}.png`} />
          <AvatarFallback>{client?.name.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold">{client?.name}</h1>
          <p className="text-muted-foreground">{client?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Contact Name:</span> {client?.contactName}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {client?.email}
              </p>
              <p>
                <span className="font-semibold">Phone:</span> {client?.phone}
              </p>
              <p>
                <span className="font-semibold">Address:</span> {client?.address}
              </p>
              <p>
                <span className="font-semibold">Website:</span>{" "}
                <a
                  href={client?.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {client?.website}
                </a>
              </p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                <Badge variant={client?.status === "active" ? "default" : "destructive"}>
                  {client?.status}
                </Badge>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Billable Rate:</span> {client?.billableRate}
              </p>
              <p>
                <span className="font-semibold">Currency:</span> {client?.currency}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://avatar.vercel.sh/${member.email}.png`} />
                    <AvatarFallback>{member.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <p>{member.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="space-y-3 p-4">
              {clientProjects.map((project) => (
                <ProjectItem key={project.id} project={project} />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Total Time Tracked</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{(totalHours / 60).toFixed(2)} hours</p>
        </CardContent>
      </Card>
    </div>
  );
}
