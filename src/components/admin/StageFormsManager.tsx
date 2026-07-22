import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface FormField {
  id: string;
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "number";
  required: boolean;
  placeholder?: string;
}

interface StageForm {
  id: string;
  stage: string;
  fields: FormField[];
}

export function StageFormsManager() {
  const { currentUser, taskStatuses } = useAppContext();
  const { toast } = useToast();
  const [stageForms, setStageForms] = useState<StageForm[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<StageForm | null>(null);
  const [selectedStage, setSelectedStage] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);

  // Load existing forms from organization settings
  useEffect(() => {
    loadStageForms();
  }, [currentUser?.organizationId]);

  const loadStageForms = async () => {
    if (!currentUser?.organizationId) return;

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", currentUser.organizationId)
        .maybeSingle();

      if (error) throw error;

      const settings = (data?.settings as any) || {};
      setStageForms(settings.stageForms || []);
    } catch (err) {
      console.error("Error loading stage forms:", err);
    }
  };

  const saveStageForms = async (forms: StageForm[]) => {
    if (!currentUser?.organizationId) return;

    try {
      const { data: org } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", currentUser.organizationId)
        .maybeSingle();

      const settings = (org?.settings as any) || {};
      settings.stageForms = forms;

      const { error } = await supabase
        .from("organizations")
        .update({ settings })
        .eq("id", currentUser.organizationId);

      if (error) throw error;

      setStageForms(forms);
      toast({
        title: "Saved",
        description: "Stage forms updated successfully",
      });
    } catch (err) {
      console.error("Error saving stage forms:", err);
      toast({
        title: "Error",
        description: "Failed to save stage forms",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (form?: StageForm) => {
    if (form) {
      setEditingForm(form);
      setSelectedStage(form.stage);
      setFields(form.fields);
    } else {
      setEditingForm(null);
      setSelectedStage("");
      setFields([]);
    }
    setIsDialogOpen(true);
  };

  const handleSaveForm = () => {
    if (!selectedStage || fields.length === 0) {
      toast({
        title: "Error",
        description: "Please select a stage and add at least one field",
        variant: "destructive",
      });
      return;
    }

    const updatedForms = editingForm
      ? stageForms.map(f => f.id === editingForm.id ? { id: editingForm.id, stage: selectedStage, fields } : f)
      : [...stageForms, { id: `form-${Date.now()}`, stage: selectedStage, fields }];

    saveStageForms(updatedForms);
    setIsDialogOpen(false);
  };

  const handleDeleteForm = (formId: string) => {
    const updated = stageForms.filter(f => f.id !== formId);
    saveStageForms(updated);
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      name: "",
      label: "",
      type: "text",
      required: false,
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleDeleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Stage Information Forms</h3>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Form
        </Button>
      </div>

      <div className="space-y-3">
        {stageForms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No forms configured yet</p>
        ) : (
          stageForms.map((form) => (
            <Card key={form.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{form.stage}</p>
                    <p className="text-sm text-muted-foreground">{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(form)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteForm(form.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingForm ? 'Edit' : 'Create'} Stage Form</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Stage</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {taskStatuses?.map((status) => (
                    <SelectItem key={status.id} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Form Fields</Label>
                <Button size="sm" variant="outline" onClick={handleAddField}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-3">
                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fields added yet</p>
                ) : (
                  fields.map((field) => (
                    <Card key={field.id} className="p-3">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Field Name</Label>
                            <Input
                              size="sm"
                              placeholder="e.g., reason"
                              value={field.name}
                              onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input
                              size="sm"
                              placeholder="e.g., Why is this in backlog?"
                              value={field.label}
                              onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                              className="h-8"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select value={field.type} onValueChange={(type: any) => handleUpdateField(field.id, { type })}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="textarea">Long Text</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                              />
                              <span className="text-xs">Required</span>
                            </label>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteField(field.id)}
                          className="w-full"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveForm}>Save Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
