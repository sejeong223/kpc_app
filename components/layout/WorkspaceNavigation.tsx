"use client";

import { createContext, useContext } from "react";

export interface WorkspaceNavigationValue {
  sidebarId: string;
  triggerId: string;
  menuOpen: boolean;
  toggleMenu(): void;
}
interface WorkspaceNavigationProviderProps {
  value: WorkspaceNavigationValue;
  children: React.ReactNode;
}
const NavigationContext = createContext<WorkspaceNavigationValue | null>(null);

export function WorkspaceNavigationProvider({ value, children }: WorkspaceNavigationProviderProps): React.ReactElement {
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useWorkspaceNavigation(): WorkspaceNavigationValue | null {
  return useContext(NavigationContext);
}
