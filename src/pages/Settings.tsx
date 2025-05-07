
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useState } from "react";

const Settings = () => {
  const { customFields, addCustomField, updateCustomField, deleteCustomField } = useAppContext();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and application preferences
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="app">App Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your account information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input placeholder="First Name" defaultValue="Alex" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input placeholder="Last Name" defaultValue="Johnson" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="Email" defaultValue="alex@manex.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input disabled value="Admin" />
                  </div>
                </div>
                <div className="pt-4">
                  <Button>Save Changes</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to maintain account security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" placeholder="Current Password" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" placeholder="New Password" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input type="password" placeholder="Confirm Password" />
                  </div>
                </div>
                <div className="pt-4">
                  <Button>Update Password</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Teams Management</CardTitle>
              <CardDescription>
                Create and manage teams for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Team management features coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="fields" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Custom Fields</CardTitle>
                  <CardDescription>
                    Create and manage custom fields for tasks
                  </CardDescription>
                </div>
                <Button>Add New Field</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customFields.length > 0 ? (
                  customFields.map(field => (
                    <div 
                      key={field.id} 
                      className="flex justify-between items-center p-4 border rounded-md"
                    >
                      <div>
                        <h3 className="font-medium">{field.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Type: {field.type} {field.required && "(Required)"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="destructive" size="sm">Delete</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-muted-foreground">
                    No custom fields defined yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="app" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Customize the behavior of the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input placeholder="Company Name" defaultValue="Manex Inc." />
                </div>
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Input placeholder="Default Currency" defaultValue="USD" />
                </div>
                <div className="space-y-2">
                  <Label>Business Address</Label>
                  <Textarea 
                    placeholder="Business Address" 
                    defaultValue="123 Business St, Suite 100, San Francisco, CA 94103"
                  />
                </div>
                <div className="pt-4">
                  <Button>Save Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
