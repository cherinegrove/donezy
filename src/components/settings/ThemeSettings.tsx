
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ColorScheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

interface ThemeSettingsProps {
  userId: string;
}

// Predefined themes
const themes: ColorScheme[] = [
  {
    name: "Default",
    primary: "#8B5CF6",
    secondary: "#D946EF",
    accent: "#F97316",
    background: "#FFFFFF"
  },
  {
    name: "Ocean",
    primary: "#0EA5E9",
    secondary: "#38BDF8",
    accent: "#22D3EE",
    background: "#F0F9FF"
  },
  {
    name: "Forest",
    primary: "#10B981",
    secondary: "#34D399",
    accent: "#4ADE80",
    background: "#ECFDF5"
  },
  {
    name: "Sunset",
    primary: "#F97316",
    secondary: "#FB923C",
    accent: "#FDBA74",
    background: "#FFF7ED"
  },
  {
    name: "Berry",
    primary: "#D946EF",
    secondary: "#E879F9",
    accent: "#F0ABFC",
    background: "#FAF5FF"
  },
  {
    name: "Dark Mode",
    primary: "#9333EA",
    secondary: "#A855F7",
    accent: "#D8B4FE",
    background: "#1E1E1E"
  }
];

export function ThemeSettings({ userId }: ThemeSettingsProps) {
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState("Default");
  const [customColors, setCustomColors] = useState({
    primary: "#8B5CF6",
    secondary: "#D946EF",
    accent: "#F97316",
    background: "#FFFFFF"
  });
  const [useCustomColors, setUseCustomColors] = useState(false);

  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName);
    setUseCustomColors(themeName === "Custom");
    
    // If selecting a predefined theme, update the custom colors to match it
    if (themeName !== "Custom") {
      const theme = themes.find(t => t.name === themeName);
      if (theme) {
        setCustomColors({
          primary: theme.primary,
          secondary: theme.secondary,
          accent: theme.accent,
          background: theme.background
        });
      }
    }
  };

  const handleColorChange = (colorKey: keyof typeof customColors, value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
  };

  const handleSaveTheme = () => {
    // Here you would save the theme to user preferences
    toast({
      title: "Theme settings saved",
      description: useCustomColors 
        ? "Your custom theme has been applied"
        : `Theme has been updated to ${selectedTheme}`
    });
  };

  // Function to validate hex color
  const isValidHex = (color: string) => {
    return /^#([A-Fa-f0-9]{3,4}){1,2}$/.test(color);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Settings</CardTitle>
        <CardDescription>
          Customize the appearance of your workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Select Theme</h3>
            <RadioGroup 
              value={selectedTheme} 
              onValueChange={handleThemeChange}
              className="grid grid-cols-2 gap-4 pt-3"
            >
              {themes.map(theme => (
                <div 
                  key={theme.name}
                  className="flex items-center space-x-2"
                >
                  <RadioGroupItem value={theme.name} id={`theme-${theme.name}`} />
                  <Label 
                    htmlFor={`theme-${theme.name}`}
                    className="flex items-center cursor-pointer"
                  >
                    <div 
                      className="w-8 h-8 rounded-full mr-2"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span>{theme.name}</span>
                  </Label>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Custom" id="theme-custom" />
                <Label 
                  htmlFor="theme-custom"
                  className="flex items-center cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full mr-2 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500" />
                  <span>Custom</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {useCustomColors && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Custom Colors</h3>
              <p className="text-sm text-muted-foreground">
                Enter HEX color codes to customize your theme
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">
                    Primary Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: customColors.primary }}
                    />
                    <Input 
                      id="primary-color"
                      type="text"
                      value={customColors.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                      className="font-mono"
                      maxLength={7}
                    />
                  </div>
                  {!isValidHex(customColors.primary) && (
                    <p className="text-xs text-red-500">Please enter a valid HEX color code</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondary-color">
                    Secondary Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: customColors.secondary }}
                    />
                    <Input 
                      id="secondary-color"
                      type="text"
                      value={customColors.secondary}
                      onChange={(e) => handleColorChange('secondary', e.target.value)}
                      className="font-mono"
                      maxLength={7}
                    />
                  </div>
                  {!isValidHex(customColors.secondary) && (
                    <p className="text-xs text-red-500">Please enter a valid HEX color code</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accent-color">
                    Accent Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: customColors.accent }}
                    />
                    <Input 
                      id="accent-color"
                      type="text"
                      value={customColors.accent}
                      onChange={(e) => handleColorChange('accent', e.target.value)}
                      className="font-mono"
                      maxLength={7}
                    />
                  </div>
                  {!isValidHex(customColors.accent) && (
                    <p className="text-xs text-red-500">Please enter a valid HEX color code</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="background-color">
                    Background Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: customColors.background }}
                    />
                    <Input 
                      id="background-color"
                      type="text"
                      value={customColors.background}
                      onChange={(e) => handleColorChange('background', e.target.value)}
                      className="font-mono"
                      maxLength={7}
                    />
                  </div>
                  {!isValidHex(customColors.background) && (
                    <p className="text-xs text-red-500">Please enter a valid HEX color code</p>
                  )}
                </div>
              </div>
              
              <div className="p-4 rounded-md mt-4" style={{ backgroundColor: customColors.background }}>
                <h4 className="font-medium mb-2" style={{ color: customColors.primary }}>Preview</h4>
                <div className="flex space-x-2">
                  <Button style={{ backgroundColor: customColors.primary, color: 'white' }}>
                    Primary Button
                  </Button>
                  <Button style={{ backgroundColor: customColors.secondary, color: 'white' }}>
                    Secondary 
                  </Button>
                  <Button style={{ backgroundColor: customColors.accent, color: 'white' }}>
                    Accent
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <Button onClick={handleSaveTheme} className="w-full">
            Save Theme Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
