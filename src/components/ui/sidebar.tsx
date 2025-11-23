
import * as React from 'react';

// Define a proper type for the context that includes collapsed and setCollapsed
type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
};

// Create the context with a default value that matches the type
const SidebarContext = React.createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggleSidebar: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Always keep sidebar expanded (not collapsed)
  const collapsed = false;
  const setCollapsed = React.useCallback(() => {
    // Do nothing - prevent collapsing
  }, []);

  const toggleSidebar = React.useCallback(() => {
    // Do nothing - prevent toggling
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const context = React.useContext(SidebarContext);
  
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  
  return context;
};
