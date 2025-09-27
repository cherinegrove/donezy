import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NativeFieldConfig {
  id: string;
  entity_type: 'tasks' | 'projects';
  field_name: string;
  required: boolean;
  hidden: boolean;
}

export function useNativeFieldConfigs(entityType: 'tasks' | 'projects') {
  const [configs, setConfigs] = useState<NativeFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, [entityType]);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('native_field_configs')
        .select('*')
        .eq('entity_type', entityType);
      
      if (error) throw error;
      
      setConfigs((data || []).map(item => ({
        ...item,
        entity_type: item.entity_type as 'tasks' | 'projects'
      })));
    } catch (error) {
      console.error('Error fetching native field configs:', error);
      toast({
        title: "Error",
        description: "Failed to load field configurations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFieldConfig = (fieldName: string) => {
    return configs.find(c => c.field_name === fieldName);
  };

  const isFieldRequired = (fieldName: string) => {
    const config = getFieldConfig(fieldName);
    return config?.required ?? false;
  };

  const isFieldHidden = (fieldName: string) => {
    const config = getFieldConfig(fieldName);
    return config?.hidden ?? false;
  };

  return {
    configs,
    loading,
    getFieldConfig,
    isFieldRequired,
    isFieldHidden,
    refetch: fetchConfigs
  };
}