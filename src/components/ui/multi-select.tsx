
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";

type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selectedValues,
  onValueChange,
  placeholder = "Select options",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (value: string) => {
    onValueChange(selectedValues.filter((v) => v !== value));
  };

  const handleSelect = (value: string) => {
    setInputValue("");
    if (selectedValues.includes(value)) {
      handleUnselect(value);
    } else {
      onValueChange([...selectedValues, value]);
    }
  };

  const selectedItems = selectedValues.map(
    (value) => options.find((option) => option.value === value) || { label: value, value }
  );

  return (
    <div className="relative">
      <div
        className={`flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
      >
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((item) => (
            <Badge
              key={item.value}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {item.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleUnselect(item.value)}
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {item.label}</span>
                </button>
              )}
            </Badge>
          ))}
          <CommandPrimitive>
            <input
              disabled={disabled}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              placeholder={selectedItems.length === 0 ? placeholder : ""}
            />
          </CommandPrimitive>
        </div>
      </div>
      {open && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground rounded-md border border-input shadow-md">
          <Command>
            <CommandGroup>
              {options
                .filter((option) =>
                  option.label.toLowerCase().includes(inputValue.toLowerCase())
                )
                .map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div
                      className={`h-4 w-4 border rounded-sm mr-2 flex items-center justify-center ${
                        selectedValues.includes(option.value)
                          ? "bg-primary border-primary"
                          : "border-input"
                      }`}
                    >
                      {selectedValues.includes(option.value) && (
                        <span className="text-primary-foreground text-xs">✓</span>
                      )}
                    </div>
                    {option.label}
                  </CommandItem>
                ))}
              {options.filter((option) =>
                option.label.toLowerCase().includes(inputValue.toLowerCase())
              ).length === 0 && (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  No results found.
                </p>
              )}
            </CommandGroup>
          </Command>
        </div>
      )}
    </div>
  );
}
