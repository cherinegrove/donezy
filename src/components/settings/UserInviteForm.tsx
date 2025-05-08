
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamMemberInviteForm } from "./TeamMemberInviteForm";
import { ClientUserInviteForm } from "./ClientUserInviteForm";

export interface UserInviteFormProps {
  defaultTab?: "team-member" | "client-user";
  onSuccess?: () => void;
}

export function UserInviteForm({ defaultTab = "team-member", onSuccess }: UserInviteFormProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-2 mb-6">
        <TabsTrigger value="team-member">Team Member</TabsTrigger>
        <TabsTrigger value="client-user">Client User</TabsTrigger>
      </TabsList>
      
      <TabsContent value="team-member">
        <TeamMemberInviteForm onSuccess={onSuccess} />
      </TabsContent>
      
      <TabsContent value="client-user">
        <ClientUserInviteForm onSuccess={onSuccess} />
      </TabsContent>
    </Tabs>
  );
}
