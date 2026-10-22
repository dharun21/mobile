import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { vars } from 'nativewind';
import { sessionStorage } from '../services/sessionStorage';

export type ThemeMode = 'dark' | 'light';

const palettes = {
  dark: {
    ink: '12 11 18', panel: '20 19 28', raised: '30 25 43', line: '44 38 57',
    muted: '162 155 176', foreground: '245 243 255', lilac: '196 181 253',
    lilacBright: '237 233 254', mint: '128 221 180', amber: '255 210 138',
    rose: '255 157 174', body: '213 206 222', action: '196 181 253', actionForeground: '12 11 18',
  },
  light: {
    ink: '247 245 250', panel: '255 255 255', raised: '240 236 247', line: '226 220 235',
    muted: '105 96 119', foreground: '31 26 42', lilac: '111 78 190',
    lilacBright: '99 66 175', mint: '34 126 86', amber: '151 92 18',
    rose: '184 58 84', body: '76 68 88', action: '220 207 245', actionForeground: '39 27 62',
  },
} as const;

type ThemeContextValue = { mode: ThemeMode; isDark: boolean; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue>({ mode: 'dark', isDark: true, toggleTheme: () => undefined });
const storageKey = 'zengen.mobile.theme.v1';

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void sessionStorage.getItem(storageKey).then((saved) => {
      if (!active) return;
      if (saved === 'light' || saved === 'dark') setMode(saved);
      setLoaded(true);
    }).catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loaded) void sessionStorage.setItem(storageKey, mode).catch(() => undefined);
  }, [loaded, mode]);

  const value = useMemo(() => ({ mode, isDark: mode === 'dark', toggleTheme: () => setMode((current) => current === 'dark' ? 'light' : 'dark') }), [mode]);
  const themeVars = useMemo(() => {
    const palette = palettes[mode];
    return vars({
      '--theme-ink': palette.ink,
      '--theme-panel': palette.panel,
      '--theme-raised': palette.raised,
      '--theme-line': palette.line,
      '--theme-muted': palette.muted,
      '--theme-foreground': palette.foreground,
      '--theme-lilac': palette.lilac,
      '--theme-lilac-bright': palette.lilacBright,
      '--theme-mint': palette.mint,
      '--theme-amber': palette.amber,
      '--theme-rose': palette.rose,
      '--theme-body': palette.body,
      '--theme-action': palette.action,
      '--theme-action-foreground': palette.actionForeground,
    });
  }, [mode]);

  return <ThemeContext.Provider value={value}><View style={themeVars} className="flex-1 bg-canvas">{children}</View></ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
