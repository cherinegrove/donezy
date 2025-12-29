import * as React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggleSidebar: () => {},
  isMobile: false,
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
  }, [isMobile]);

  return (
    <SidebarContext.Provider value={{ 
      collapsed, 
      setCollapsed, 
      toggleSidebar, 
      isMobile, 
      mobileOpen, 
      setMobileOpen 
    }}>
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

interface MobileSidebarProps {
  children: React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const { mobileOpen, setMobileOpen } = useSidebar();
  
  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="p-0 w-[280px]">
        {children}
      </SheetContent>
    </Sheet>
  );
}
