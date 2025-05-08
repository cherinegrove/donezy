
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Palette } from "lucide-react";

export function CompanyThemeSettings() {
  const { toast } = useToast();
  const [buttonColor, setButtonColor] = useState("#000000");
  const [sidebarColor, setSidebarColor] = useState("#1A1F2C");
  
  // Preview colors
  const [buttonColorPreview, setButtonColorPreview] = useState("#000000");
  const [sidebarColorPreview, setSidebarColorPreview] = useState("#1A1F2C");
  
  const handleButtonColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setButtonColorPreview(e.target.value);
  };
  
  const handleSidebarColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSidebarColorPreview(e.target.value);
  };
  
  const handleSave = () => {
    // In a real application, you would save these values to your database
    // and update your theme context or CSS variables
    setButtonColor(buttonColorPreview);
    setSidebarColor(sidebarColorPreview);
    
    toast({
      title: "Theme updated",
      description: "Your company theme settings have been saved.",
    });
    
    // Here you would trigger a theme update in your application
    // For now we're just logging the values
    console.log("Theme settings updated:", { buttonColor: buttonColorPreview, sidebarColor: sidebarColorPreview });
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <div className="flex-1">
          <CardTitle>Company Theme</CardTitle>
          <CardDescription>
            Customize your company's color scheme and branding
          </CardDescription>
        </div>
        <Palette className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="button-color">Button Color (HEX)</Label>
              <div className="flex gap-3">
                <Input 
                  id="button-color"
                  type="color" 
                  value={buttonColorPreview}
                  onChange={handleButtonColorChange}
                  className="w-16 h-10 p-1"
                />
                <Input 
                  type="text"
                  value={buttonColorPreview}
                  onChange={e => setButtonColorPreview(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-muted-foreground mr-2">Preview:</span>
                <Button
                  style={{ backgroundColor: buttonColorPreview }}
                  className="h-8 px-4 py-0"
                >
                  Button
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="sidebar-color">Sidebar Color (HEX)</Label>
              <div className="flex gap-3">
                <Input
                  id="sidebar-color" 
                  type="color" 
                  value={sidebarColorPreview}
                  onChange={handleSidebarColorChange}
                  className="w-16 h-10 p-1"
                />
                <Input 
                  type="text"
                  value={sidebarColorPreview}
                  onChange={e => setSidebarColorPreview(e.target.value)}
                  placeholder="#1A1F2C"
                  className="flex-1"
                />
              </div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-muted-foreground mr-2">Preview:</span>
                <div
                  className="h-10 w-24 rounded-md flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: sidebarColorPreview }}
                >
                  Sidebar
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              These colors will be applied to all buttons and the sidebar throughout your application.
            </p>
          </div>
        </div>
        
        <Button onClick={handleSave}>Save Company Theme</Button>
      </CardContent>
    </Card>
  );
}
