import { useState, useEffect, useCallback } from "react";

interface AutocompleteOption {
  id: string;
  label: string;
  metadata?: Record<string, any>;
}

interface UseSmartAutocompleteOptions {
  options: AutocompleteOption[];
  maxSuggestions?: number;
  enableFuzzyMatch?: boolean;
}

interface UseSmartAutocompleteReturn {
  suggestions: AutocompleteOption[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  recentSearches: AutocompleteOption[];
  addToRecent: (option: AutocompleteOption) => void;
  clearRecent: () => void;
}

const RECENT_SEARCHES_KEY = "smart-autocomplete-recent";
const MAX_RECENT_SEARCHES = 5;

export function useSmartAutocomplete({
  options,
  maxSuggestions = 10,
  enableFuzzyMatch = true,
}: UseSmartAutocompleteOptions): UseSmartAutocompleteReturn {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteOption[]>([]);
  const [recentSearches, setRecentSearches] = useState<AutocompleteOption[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load recent searches:", error);
    }
  }, []);

  // Fuzzy match algorithm
  const fuzzyMatch = useCallback((str: string, pattern: string): boolean => {
    if (!enableFuzzyMatch) {
      return str.toLowerCase().includes(pattern.toLowerCase());
    }

    pattern = pattern.toLowerCase();
    str = str.toLowerCase();
    
    let patternIdx = 0;
    let strIdx = 0;
    
    while (patternIdx < pattern.length && strIdx < str.length) {
      if (pattern[patternIdx] === str[strIdx]) {
        patternIdx++;
      }
      strIdx++;
    }
    
    return patternIdx === pattern.length;
  }, [enableFuzzyMatch]);

  // Calculate relevance score
  const calculateScore = useCallback((option: AutocompleteOption, term: string): number => {
    const label = option.label.toLowerCase();
    const searchTerm = term.toLowerCase();
    
    // Exact match
    if (label === searchTerm) return 1000;
    
    // Starts with
    if (label.startsWith(searchTerm)) return 500;
    
    // Contains (word boundary)
    const words = label.split(/\s+/);
    if (words.some(word => word.startsWith(searchTerm))) return 300;
    
    // Contains anywhere
    if (label.includes(searchTerm)) return 100;
    
    // Fuzzy match
    if (fuzzyMatch(label, searchTerm)) return 50;
    
    return 0;
  }, [fuzzyMatch]);

  // Filter and sort suggestions
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    const filtered = options
      .map(option => ({
        option,
        score: calculateScore(option, searchTerm),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(({ option }) => option);

    setSuggestions(filtered);
  }, [searchTerm, options, maxSuggestions, calculateScore]);

  // Add to recent searches
  const addToRecent = useCallback((option: AutocompleteOption) => {
    setRecentSearches(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item.id !== option.id);
      
      // Add to beginning
      const updated = [option, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      // Save to localStorage
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save recent searches:", error);
      }
      
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error("Failed to clear recent searches:", error);
    }
  }, []);

  return {
    suggestions,
    searchTerm,
    setSearchTerm,
    recentSearches,
    addToRecent,
    clearRecent,
  };
}
