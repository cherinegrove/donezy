import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Globe, DollarSign, Bell, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIMEZONES = [
  { value: "UTC", label: "(UTC+00:00) Coordinated Universal Time" },
  { value: "America/New_York", label: "(UTC-05:00) Eastern Time" },
  { value: "America/Chicago", label: "(UTC-06:00) Central Time" },
  { value: "America/Denver", label: "(UTC-07:00) Mountain Time" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time" },
  { value: "Europe/London", label: "(UTC+00:00) London" },
  { value: "Europe/Paris", label: "(UTC+01:00) Central European Time" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Japan Standard Time" },
  { value: "Asia/Shanghai", label: "(UTC+08:00) China Standard Time" },
  { value: "Australia/Sydney", label: "(UTC+10:00) Australian Eastern Time" }
];

const DEFAULT_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" }
];

export function SystemPreferences() {
  const { toast } = useToast();
  const [selectedTimezone, setSelectedTimezone] = useState("UTC");
  const [currencies, setCurrencies] = useState(DEFAULT_CURRENCIES);
  const [newCurrency, setNewCurrency] = useState({ code: "", name: "", symbol: "" });

  const handleAddCurrency = () => {
    if (newCurrency.code && newCurrency.name && newCurrency.symbol) {
      setCurrencies([...currencies, { ...newCurrency }]);
      setNewCurrency({ code: "", name: "", symbol: "" });
      toast({
        title: "Currency Added",
        description: `${newCurrency.name} (${newCurrency.code}) has been added.`
      });
    }
  };

  const handleRemoveCurrency = (code: string) => {
    setCurrencies(currencies.filter(c => c.code !== code));
    toast({
      title: "Currency Removed",
      description: `Currency ${code} has been removed.`
    });
  };

  const handleSavePreferences = () => {
    toast({
      title: "Preferences Saved",
      description: "System preferences have been updated successfully."
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          System Preferences
        </CardTitle>
        <CardDescription>Configure global system preferences and settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timezone Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <Label className="font-medium">Default Timezone</Label>
          </div>
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currencies Management */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <Label className="font-medium">Currencies</Label>
          </div>
          
          {/* Existing Currencies */}
          <div className="space-y-2">
            {currencies.map((currency) => (
              <div key={currency.code} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium">{currency.symbol}</span>
                  <div>
                    <span className="font-medium">{currency.code}</span>
                    <span className="text-muted-foreground ml-2">{currency.name}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCurrency(currency.code)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add New Currency */}
          <div className="grid grid-cols-4 gap-2">
            <Input
              placeholder="Code (USD)"
              value={newCurrency.code}
              onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
              maxLength={3}
            />
            <Input
              placeholder="Name"
              value={newCurrency.name}
              onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
            />
            <Input
              placeholder="Symbol ($)"
              value={newCurrency.symbol}
              onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
              maxLength={3}
            />
            <Button onClick={handleAddCurrency} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSavePreferences}>
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
