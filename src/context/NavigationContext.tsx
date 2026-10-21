import React, { createContext, useContext } from 'react';
import type { AppScreen } from '../config';

const NavigationContext = createContext<(screen: AppScreen) => void>(() => undefined);
export const NavigationProvider = NavigationContext.Provider;
export function useNavigateApp() { return useContext(NavigationContext); }
