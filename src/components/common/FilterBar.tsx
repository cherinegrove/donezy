import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Filter, X, Save, Star, Trash2 } from "lucide-react";
import { useFilterPresets } from "@/hooks/useFilterPresets";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export interface FilterOption {
  id: string;
  name: string;
  options: {
    id: string;
    label: string;
  }[];
}

interface FilterBarProps {
  filters: FilterOption[];
  onFilterChange: (filters: Record<string, string[]>) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [presetName, setPresetName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { presets, savePreset, deletePreset, loadPreset } = useFilterPresets();
  const { toast } = useToast();

  useEffect(() => {
    onFilterChange(activeFilters);
  }, [activeFilters]);

  const handleFilterChange = (filterId: string, value: string) => {
    const newActiveFilters = { ...activeFilters };

    if (!newActiveFilters[filterId]) {
      newActiveFilters[filterId] = [];
    }

    if (!newActiveFilters[filterId].includes(value)) {
      newActiveFilters[filterId] = [...newActiveFilters[filterId], value];
    }

    setActiveFilters(newActiveFilters);
  };

  const removeFilter = (filterId: string, value: string) => {
    const newActiveFilters = { ...activeFilters };

    if (newActiveFilters[filterId]) {
      newActiveFilters[filterId] = newActiveFilters[filterId].filter((v) => v !== value);

      if (newActiveFilters[filterId].length === 0) {
        delete newActiveFilters[filterId];
      }
    }

    setActiveFilters(newActiveFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a preset name",
        variant: "destructive",
      });
      return;
    }

    savePreset(presetName, activeFilters);
    toast({
      title: "Success",
      description: `Filter preset "${presetName}" saved`,
    });
    setPresetName("");
    setShowSaveDialog(false);
  };

  const handleLoadPreset = (id: string) => {
    const filters = loadPreset(id);
    if (filters) {
      setActiveFilters(filters);
    }
  };

  const handleDeletePreset = (id: string, name: string) => {
    deletePreset(id);
    toast({
      title: "Success",
      description: `Filter preset "${name}" deleted`,
    });
  };

  const getActiveBadges = () => {
    const badges: { filterId: string; filterName: string; value: string; label: string }[] = [];

    Object.entries(activeFilters).forEach(([filterId, values]) => {
      const filter = filters.find((f) => f.id === filterId);

      if (filter) {
        values.forEach((value) => {
          const option = filter.options.find((o) => o.id === value);
          if (option) {
            badges.push({
              filterId,
              filterName: filter.name,
              value,
              label: option.label,
            });
          }
        });
      }
    });

    return badges;
  };

  const activeBadges = getActiveBadges();
  const hasActiveFilters = activeBadges.length > 0;

  return (
    <div className="space-y-3">
      {/* Saved Presets */}
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Star className="h-3 w-3" />
            Saved Filters:
          </span>
          {presets.map((preset) => (
            <Badge
              key={preset.id}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 gap-2 flex items-center"
            >
              <span onClick={() => handleLoadPreset(preset.id)}>{preset.name}</span>
              <Trash2
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePreset(preset.id, preset.name);
                }}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Filter selectors and badges */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Popover key={filter.id}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  {filter.name}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="grid gap-2">
                  <h4 className="font-medium text-sm px-2 py-1">{filter.name}</h4>
                  <Separator />
                  <div className="grid gap-1 mt-1">
                    {filter.options.map((option) => (
                      <Button
                        key={option.id}
                        variant="ghost"
                        size="sm"
                        className="justify-start font-normal"
                        onClick={() => handleFilterChange(filter.id, option.id)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ))}

          {hasActiveFilters && (
            <>
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground h-9">
                Clear filters
              </Button>

              {/* Save Preset Button */}
              <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1">
                    <Save className="h-3 w-3" />
                    Save Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-medium">Save Filter Preset</h4>
                    <Input
                      placeholder="Enter preset name..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSavePreset();
                        }
                      }}
                    />
                    <Button onClick={handleSavePreset} className="w-full" size="sm">
                      Save
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>

        {/* Active filters as badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1">
            {activeBadges.map((badge, index) => (
              <Badge key={index} variant="secondary" className="px-2 py-1">
                <span className="text-xs text-muted-foreground mr-1">{badge.filterName}:</span>
                <span className="mr-1">{badge.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => removeFilter(badge.filterId, badge.value)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove filter</span>
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
