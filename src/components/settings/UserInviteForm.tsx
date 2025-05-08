
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMemberInviteForm } from "./TeamMemberInviteForm";
import { ClientUserInviteForm } from "./ClientUserInviteForm";

export function UserInviteForm() {
  const [activeTab, setActiveTab] = useState("team-member");
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-2 mb-6">
        <TabsTrigger value="team-member">Team Member</TabsTrigger>
        <TabsTrigger value="client-user">Client User</TabsTrigger>
      </TabsList>
      
      <TabsContent value="team-member">
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
            <CardDescription>
              Invite a new member to join your team with specific role and billing settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMemberInviteForm />
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="client-user">
        <Card>
          <CardHeader>
            <CardTitle>Invite Client User</CardTitle>
            <CardDescription>
              Invite a client user with access to specific projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientUserInviteForm />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
