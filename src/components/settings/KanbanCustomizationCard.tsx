
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette } from "lucide-react";

interface ColorOption {
  name: string;
  value: string;
  label: string;
}

const defaultColors = [
  { name: "backlog", value: "#F3F4F6", label: "Backlog" },
  { name: "todo", value: "#DBEAFE", label: "To Do" },
  { name: "in-progress", value: "#FEF3C7", label: "In Progress" },
  { name: "review", value: "#FCE7F3", label: "Review" },
  { name: "done", value: "#DCFCE7", label: "Done" }
];

const predefinedPalettes = [
  {
    name: "Default",
    colors: {
      backlog: "#F3F4F6",
      todo: "#DBEAFE", 
      "in-progress": "#FEF3C7", 
      review: "#FCE7F3", 
      done: "#DCFCE7"
    }
  },
  {
    name: "Ocean",
    colors: {
      backlog: "#F0F9FF",
      todo: "#CFFAFE", 
      "in-progress": "#A5F3FC", 
      review: "#67E8F9", 
      done: "#0EA5E9"
    }
  },
  {
    name: "Forest",
    colors: {
      backlog: "#F0FDF4",
      todo: "#DCFCE7", 
      "in-progress": "#BBF7D0", 
      review: "#86EFAC", 
      done: "#15803D"
    }
  },
  {
    name: "Sunset",
    colors: {
      backlog: "#FFF7ED",
      todo: "#FFEDD5", 
      "in-progress": "#FED7AA", 
      review: "#FB923C", 
      done: "#EA580C"
    }
  }
];

export const KanbanCustomizationCard = () => {
  const [colors, setColors] = useState<ColorOption[]>(defaultColors);
  const { toast } = useToast();
  
  // Load saved kanban colors on mount
  useEffect(() => {
    const savedColors = localStorage.getItem('kanbanColors');
    if (savedColors) {
      try {
        setColors(JSON.parse(savedColors));
      } catch (e) {
        console.error('Error parsing kanban colors from localStorage', e);
      }
    }
  }, []);
  
  const handleColorChange = (name: string, value: string) => {
    setColors(prev => 
      prev.map(color => color.name === name ? { ...color, value } : color)
    );
  };
  
  const applyPalette = (palette: typeof predefinedPalettes[number]) => {
    const newColors = colors.map(color => ({
      ...color,
      value: palette.colors[color.name as keyof typeof palette.colors]
    }));
    
    setColors(newColors);
    toast({
      title: "Palette Applied",
      description: `${palette.name} palette has been applied to your kanban board`
    });
  };
  
  const saveChanges = () => {
    // Save to localStorage
    localStorage.setItem('kanbanColors', JSON.stringify(colors));
    
    // Apply CSS variables for the kanban colors
    colors.forEach(color => {
      document.documentElement.style.setProperty(`--kanban-${color.name}-color`, color.value);
    });
    
    toast({
      title: "Changes Saved",
      description: "Your kanban color customizations have been saved"
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Kanban Board Customization</CardTitle>
            <CardDescription>
              Customize the colors for each column in your kanban boards
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {colors.map(color => (
              <div key={color.name} className="space-y-2">
                <Label htmlFor={`color-${color.name}`}>{color.label}</Label>
                <div className="flex gap-2">
                  <div 
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: color.value }}
                  />
                  <Input
                    id={`color-${color.name}`}
                    type="text"
                    value={color.value}
                    onChange={(e) => handleColorChange(color.name, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-3">
            <Label>Color Presets</Label>
            <div className="flex flex-wrap gap-2">
              {predefinedPalettes.map(palette => (
                <Button 
                  key={palette.name}
                  variant="outline"
                  onClick={() => applyPalette(palette)}
                >
                  {palette.name}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button onClick={saveChanges}>Save Changes</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
