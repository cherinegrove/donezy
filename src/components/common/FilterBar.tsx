
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
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
    <div className="flex flex-col space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="grid gap-4">
              <h4 className="font-medium leading-none">Filters</h4>
              <div className="grid gap-3">
                {filters.map(filter => (
                  <div key={filter.id}>
                    <h5 className="mb-2 text-sm font-medium">{filter.name}</h5>
                    <Select onValueChange={(value) => handleFilterChange(filter.id, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${filter.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options.map(option => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {hasActiveFilters && (
                <>
                  <Separator />
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
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
            
            {activeBadges.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={clearAllFilters}
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
