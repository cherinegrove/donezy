
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Palette } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function CompanyThemeSettings() {
  const { toast } = useToast();
  const { colors, updateColors } = useTheme();
  
  // Preview colors
  const [buttonColorPreview, setButtonColorPreview] = useState(colors.buttonColor);
  const [buttonTextColorPreview, setButtonTextColorPreview] = useState(colors.buttonTextColor);
  const [sidebarColorPreview, setSidebarColorPreview] = useState(colors.sidebarColor);
  const [sidebarTextColorPreview, setSidebarTextColorPreview] = useState(colors.sidebarTextColor);
  
  useEffect(() => {
    // Update preview state when theme context changes
    setButtonColorPreview(colors.buttonColor);
    setButtonTextColorPreview(colors.buttonTextColor);
    setSidebarColorPreview(colors.sidebarColor);
    setSidebarTextColorPreview(colors.sidebarTextColor);
  }, [colors]);
  
  const handleButtonColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setButtonColorPreview(e.target.value);
  };
  
  const handleButtonTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setButtonTextColorPreview(e.target.value);
  };
  
  const handleSidebarColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSidebarColorPreview(e.target.value);
  };
  
  const handleSidebarTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSidebarTextColorPreview(e.target.value);
  };
  
  const handleSave = () => {
    updateColors({
      buttonColor: buttonColorPreview,
      buttonTextColor: buttonTextColorPreview,
      sidebarColor: sidebarColorPreview,
      sidebarTextColor: sidebarTextColorPreview
    });
    
    toast({
      title: "Theme updated",
      description: "Your company theme settings have been saved and applied.",
    });
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
            {/* Button Background Color */}
            <div className="space-y-3">
              <Label htmlFor="button-color">Button Background Color</Label>
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
            </div>
            
            {/* Button Text Color */}
            <div className="space-y-3">
              <Label htmlFor="button-text-color">Button Text Color</Label>
              <div className="flex gap-3">
                <Input 
                  id="button-text-color"
                  type="color" 
                  value={buttonTextColorPreview}
                  onChange={handleButtonTextColorChange}
                  className="w-16 h-10 p-1"
                />
                <Input 
                  type="text"
                  value={buttonTextColorPreview}
                  onChange={e => setButtonTextColorPreview(e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
            
            {/* Sidebar Background Color */}
            <div className="space-y-3">
              <Label htmlFor="sidebar-color">Sidebar Background Color</Label>
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
            </div>
            
            {/* Sidebar Text Color */}
            <div className="space-y-3">
              <Label htmlFor="sidebar-text-color">Sidebar Text Color</Label>
              <div className="flex gap-3">
                <Input
                  id="sidebar-text-color" 
                  type="color" 
                  value={sidebarTextColorPreview}
                  onChange={handleSidebarTextColorChange}
                  className="w-16 h-10 p-1"
                />
                <Input 
                  type="text"
                  value={sidebarTextColorPreview}
                  onChange={e => setSidebarTextColorPreview(e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          
          {/* Preview Section */}
          <div className="mt-6 border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Preview</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div>
                <Button
                  style={{ 
                    backgroundColor: buttonColorPreview,
                    color: buttonTextColorPreview
                  }}
                >
                  Button Preview
                </Button>
              </div>
              
              <div
                className="h-16 w-full sm:w-48 rounded-md flex items-center justify-center text-center p-2"
                style={{ 
                  backgroundColor: sidebarColorPreview,
                  color: sidebarTextColorPreview
                }}
              >
                Sidebar Preview
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
