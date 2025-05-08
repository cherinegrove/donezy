
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
        <TeamMemberInviteForm />
      </TabsContent>
      
      <TabsContent value="client-user">
        <ClientUserInviteForm />
      </TabsContent>
    </Tabs>
  );
}
