import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectFavorite {
  id: string;
  user_id: string;
  project_id: string;
  created_at: string;
}

export function useProjectFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_project_favorites')
        .select('project_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites(data?.map(f => f.project_id) || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = useCallback(async (projectId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to favorite projects",
          variant: "destructive",
        });
        return;
      }

      const isFavorite = favorites.includes(projectId);

      if (isFavorite) {
        // Remove favorite
        const { error } = await supabase
          .from('user_project_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('project_id', projectId);

        if (error) throw error;

        setFavorites(prev => prev.filter(id => id !== projectId));
        toast({
          title: "Removed from favorites",
          description: "Project removed from your favorites",
        });
      } else {
        // Add favorite
        const { error } = await supabase
          .from('user_project_favorites')
          .insert({
            user_id: user.id,
            project_id: projectId,
          });

        if (error) throw error;

        setFavorites(prev => [...prev, projectId]);
        toast({
          title: "Added to favorites",
          description: "Project added to your favorites",
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  }, [favorites, toast]);

  const isFavorite = useCallback((projectId: string) => {
    return favorites.includes(projectId);
  }, [favorites]);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    refreshFavorites: loadFavorites,
  };
}
