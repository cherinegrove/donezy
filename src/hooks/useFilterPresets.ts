import { useState, useEffect } from 'react';

export interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, string[]>;
  createdAt: string;
}

const STORAGE_KEY = 'filter-presets';

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPresets(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse filter presets:', e);
      }
    }
  }, []);

  const savePreset = (name: string, filters: Record<string, string[]>) => {
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date().toISOString(),
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const loadPreset = (id: string): Record<string, string[]> | null => {
    const preset = presets.find(p => p.id === id);
    return preset?.filters || null;
  };

  return {
    presets,
    savePreset,
    deletePreset,
    loadPreset,
  };
}
