import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X, Save, Star, Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSmartAutocomplete } from "@/hooks/useSmartAutocomplete";

export interface FilterOption {
  id: string;
  name: string;
  options: {
    id: string;
    label: string;
  }[];
}

interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, string[]>;
}

interface EnhancedFilterBarProps {
  filters: FilterOption[];
  onFilterChange: (filters: Record<string, string[]>) => void;
  presetKey?: string; // Unique key for storing presets
}

const PRESETS_STORAGE_KEY = "filter-presets";

export function EnhancedFilterBar({ 
  filters, 
  onFilterChange,
  presetKey = "default",
}: EnhancedFilterBarProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${PRESETS_STORAGE_KEY}-${presetKey}`);
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load presets:", error);
    }
  }, [presetKey]);

  // Save presets to localStorage
  const savePresets = (newPresets: FilterPreset[]) => {
    try {
      localStorage.setItem(`${PRESETS_STORAGE_KEY}-${presetKey}`, JSON.stringify(newPresets));
      setPresets(newPresets);
    } catch (error) {
      console.error("Failed to save presets:", error);
      toast({
        title: "Error",
        description: "Failed to save filter preset",
        variant: "destructive",
      });
    }
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newActiveFilters = { ...activeFilters };
    
    if (!newActiveFilters[filterId]) {
      newActiveFilters[filterId] = [];
    }
    
    if (!newActiveFilters[filterId].includes(value)) {
      newActiveFilters[filterId] = [...newActiveFilters[filterId], value];
    }
    
    setActiveFilters(newActiveFilters);
    onFilterChange(newActiveFilters);
  };

  const removeFilter = (filterId: string, value: string) => {
    const newActiveFilters = { ...activeFilters };
    
    if (newActiveFilters[filterId]) {
      newActiveFilters[filterId] = newActiveFilters[filterId].filter(v => v !== value);
      
      if (newActiveFilters[filterId].length === 0) {
        delete newActiveFilters[filterId];
      }
    }
    
    setActiveFilters(newActiveFilters);
    onFilterChange(newActiveFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    onFilterChange({});
    setSearchTerms({});
  };

  const saveCurrentPreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the preset",
        variant: "destructive",
      });
      return;
    }

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: activeFilters,
    };

    savePresets([...presets, newPreset]);
    setIsSaveDialogOpen(false);
    setPresetName("");
    
    toast({
      title: "Preset saved",
      description: `Filter preset "${presetName}" has been saved`,
    });
  };

  const loadPreset = (preset: FilterPreset) => {
    setActiveFilters(preset.filters);
    onFilterChange(preset.filters);
    
    toast({
      title: "Preset loaded",
      description: `Loaded filter preset "${preset.name}"`,
    });
  };

  const deletePreset = (presetId: string) => {
    const updated = presets.filter(p => p.id !== presetId);
    savePresets(updated);
    
    toast({
      title: "Preset deleted",
      description: "Filter preset has been removed",
    });
  };

  const getActiveBadges = () => {
    const badges: { filterId: string; filterName: string; value: string; label: string }[] = [];
    
    Object.entries(activeFilters).forEach(([filterId, values]) => {
      const filter = filters.find(f => f.id === filterId);
      
      if (filter) {
        values.forEach(value => {
          const option = filter.options.find(o => o.id === value);
          if (option) {
            badges.push({
              filterId,
              filterName: filter.name,
              value,
              label: option.label
            });
          }
        });
      }
    });
    
    return badges;
  };

  const getFilteredOptions = (filter: FilterOption) => {
    const searchTerm = searchTerms[filter.id] || "";
    if (!searchTerm) return filter.options;

    return filter.options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const activeBadges = getActiveBadges();
  const hasActiveFilters = activeBadges.length > 0;

  return (
    <div className="space-y-4">
      {/* Filter selectors and presets */}
      <div className="flex flex-wrap gap-2">
        {/* Saved Presets */}
        {presets.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Star className="mr-2 h-3 w-3" />
                Saved Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="grid gap-1">
                <h4 className="font-medium text-sm px-2 py-1">Saved Filter Presets</h4>
                <Separator />
                <div className="mt-1 space-y-1">
                  {presets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start font-normal flex-1"
                        onClick={() => loadPreset(preset)}
                      >
                        <Clock className="mr-2 h-3 w-3" />
                        {preset.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => deletePreset(preset.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Filter options */}
        {filters.map(filter => {
          const filteredOptions = getFilteredOptions(filter);
          const autocomplete = useSmartAutocomplete({
            options: filter.options.map(opt => ({ id: opt.id, label: opt.label })),
          });

          return (
            <Popover key={filter.id}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  {filter.name}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="grid gap-2">
                  <h4 className="font-medium text-sm px-2 py-1">{filter.name}</h4>
                  
                  {/* Search input */}
                  <Input
                    placeholder={`Search ${filter.name.toLowerCase()}...`}
                    value={searchTerms[filter.id] || ""}
                    onChange={(e) => setSearchTerms(prev => ({ ...prev, [filter.id]: e.target.value }))}
                    className="h-8"
                  />
                  
                  <Separator />
                  
                  {/* Recent searches */}
                  {autocomplete.recentSearches.length > 0 && !searchTerms[filter.id] && (
                    <>
                      <div className="px-2">
                        <p className="text-xs text-muted-foreground mb-1">Recent</p>
                        <div className="grid gap-1">
                          {autocomplete.recentSearches.map(recent => (
                            <Button
                              key={recent.id}
                              variant="ghost"
                              size="sm"
                              className="justify-start font-normal"
                              onClick={() => {
                                handleFilterChange(filter.id, recent.id);
                                autocomplete.addToRecent(recent);
                              }}
                            >
                              <Clock className="mr-2 h-3 w-3 text-muted-foreground" />
                              {recent.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  
                  {/* Options list */}
                  <div className="grid gap-1 max-h-64 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map(option => (
                        <Button
                          key={option.id}
                          variant="ghost"
                          size="sm"
                          className="justify-start font-normal"
                          onClick={() => {
                            handleFilterChange(filter.id, option.id);
                            autocomplete.addToRecent({ id: option.id, label: option.label });
                          }}
                        >
                          {option.label}
                        </Button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground px-2 py-2">No results found</p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
        
        {/* Action buttons */}
        {hasActiveFilters && (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsSaveDialogOpen(true)}
              className="text-muted-foreground h-9"
            >
              <Save className="mr-2 h-3 w-3" />
              Save
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-muted-foreground h-9"
            >
              Clear filters
            </Button>
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

      {/* Save Preset Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Give your filter combination a name to quickly access it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., High Priority Tasks"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveCurrentPreset();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCurrentPreset}>
              <Save className="mr-2 h-4 w-4" />
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
