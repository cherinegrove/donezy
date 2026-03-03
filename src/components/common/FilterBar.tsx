
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
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
  selectedFilters?: Record<string, string[]>; // Optional controlled mode
}

export function FilterBar({ filters, onFilterChange, selectedFilters: externalFilters }: FilterBarProps) {
  const [internalFilters, setInternalFilters] = useState<Record<string, string[]>>({});
  
  // Use external filters if provided (controlled mode), otherwise use internal state
  const activeFilters = externalFilters ?? internalFilters;
  
  const setActiveFilters = (newFilters: Record<string, string[]>) => {
    if (!externalFilters) {
      setInternalFilters(newFilters);
    }
    onFilterChange(newFilters);
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
  };
  
  const clearAllFilters = () => {
    setActiveFilters({});
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
  
  const activeBadges = getActiveBadges();
  const hasActiveFilters = activeBadges.length > 0;
  
  return (
    <div className="space-y-4">
      {/* Filter selectors spread horizontally */}
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <Popover key={filter.id}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                {filter.name}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start" sideOffset={4}>
              <div className="grid gap-2">
                <h4 className="font-medium text-sm px-2 py-1">{filter.name}</h4>
                <Separator />
                <div className="grid gap-1 mt-1 max-h-60 overflow-y-auto">
                  {filter.options.map(option => (
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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="text-muted-foreground h-9"
          >
            Clear filters
          </Button>
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
  );
}
