
import * as React from "react";
import { X, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export type Option = {
  value: string;
  label: string;
  avatar?: string;
  initials?: string;
};

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowFileUpload?: boolean;
  onFileUpload?: (file: File) => void;
}

export function MultiSelect({
  options = [], // Default to empty array
  selectedValues = [], // Default to empty array
  onValueChange,
  placeholder = "Select options",
  disabled = false,
  className,
  allowFileUpload = false,
  onFileUpload,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [fileDialogOpen, setFileDialogOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Force empty arrays when undefined to prevent "undefined is not iterable" errors
  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];

  const handleSelect = React.useCallback(
    (value: string) => {
      if (!value) return;
      
      const updatedValues = safeSelectedValues.includes(value) 
        ? safeSelectedValues.filter((item) => item !== value)
        : [...safeSelectedValues, value];
        
      onValueChange(updatedValues);
    },
    [safeSelectedValues, onValueChange]
  );

  const handleRemove = React.useCallback(
    (value: string) => {
      if (!value) return;
      onValueChange(safeSelectedValues.filter((item) => item !== value));
    },
    [safeSelectedValues, onValueChange]
  );
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target?.files?.[0] && onFileUpload) {
      onFileUpload(e.target.files[0]);
      setFileDialogOpen(false);
    }
  };

  // Get selected items safely
  const getSelectedItems = React.useCallback(() => {
    if (!Array.isArray(safeOptions) || !Array.isArray(safeSelectedValues)) {
      return [];
    }
    
    return safeSelectedValues
      .map(value => safeOptions.find(option => option && option.value === value))
      .filter((option): option is Option => Boolean(option));
  }, [safeSelectedValues, safeOptions]);

  // Create command items using useMemo to avoid re-rendering issues
  const commandItems = React.useMemo(() => {
    if (!Array.isArray(safeOptions)) {
      return [];
    }
    
    return safeOptions
      .filter(option => option && typeof option === 'object' && 'value' in option) // Strict filtering
      .map((option) => {
        const isSelected = safeSelectedValues.includes(option.value);
        
        return (
          <CommandItem
            key={option.value}
            onSelect={() => handleSelect(option.value)}
            className={cn("flex items-center gap-2", {
              "bg-accent": isSelected,
            })}
          >
            <div
              className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", {
                "bg-primary text-primary-foreground": isSelected,
              })}
            >
              {isSelected && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            {option.avatar && (
              <img 
                src={option.avatar} 
                alt={option.label} 
                className="h-6 w-6 rounded-full mr-2" 
              />
            )}
            {!option.avatar && option.initials && (
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {option.initials}
              </div>
            )}
            <span>{option.label}</span>
          </CommandItem>
        );
      });
  }, [safeOptions, safeSelectedValues, handleSelect]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("min-h-10 h-auto w-full justify-between", className)}
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1">
              {safeSelectedValues.length > 0 ? (
                getSelectedItems().map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="mr-1 mb-1"
                  >
                    {option.label}
                    <button
                      className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(option.value);
                      }}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {option.label}</span>
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {Array.isArray(commandItems) && commandItems.length > 0 ? commandItems : null}
              {allowFileUpload && (
                <CommandItem 
                  onSelect={() => {
                    setOpen(false);
                    setFileDialogOpen(true);
                  }}
                  className="border-t mt-2 pt-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Upload file</span>
                </CommandItem>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {allowFileUpload && (
        <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload File</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col items-center justify-center gap-2">
                <label 
                  htmlFor="file-upload" 
                  className="cursor-pointer border-2 border-dashed border-gray-300 rounded-md p-8 w-full flex flex-col items-center"
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium">Click to upload or drag and drop</span>
                  <span className="text-xs text-gray-500 mt-1">Any file up to 10MB</span>
                  <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFileDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => fileInputRef.current?.click()}>Upload</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
