import React, { createContext, useContext, useState } from 'react';
import { HelpArticle, getHelpArticles } from '@/utils/helpMapping';

interface HelpContextType {
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  relevantArticles: HelpArticle[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toggleHelp: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const relevantArticles = getHelpArticles(currentPage);

  const toggleHelp = () => {
    setIsHelpOpen(!isHelpOpen);
  };

  return (
    <HelpContext.Provider
      value={{
        isHelpOpen,
        setIsHelpOpen,
        currentPage,
        setCurrentPage,
        relevantArticles,
        searchQuery,
        setSearchQuery,
        toggleHelp,
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within HelpProvider');
  }
  return context;
}
