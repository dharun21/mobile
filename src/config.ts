import { Platform } from 'react-native';

const defaultApiBaseUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api/v1'
  : 'http://127.0.0.1:8000/api/v1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl;

export const colors = {
  ink: '#0C0B12',
  panel: '#14131C',
  raised: '#1E192B',
  line: '#2C2639',
  muted: '#A29BB0',
  lilac: '#C4B5FD',
  text: '#F5F3FF',
  mint: '#80DDB4',
  amber: '#FFD28A',
  rose: '#FF9DAE',
  action: '#C4B5FD',
  actionForeground: '#0C0B12',
};

const darkColors = { ...colors };
export function applyColorScheme(mode: 'dark' | 'light') {
  Object.assign(colors, mode === 'dark' ? darkColors : {
    ink: '#0C0B12', panel: '#FFFFFF', raised: '#F0ECF7', line: '#E2DCEB',
    muted: '#696077', lilac: '#6F4EBE', text: '#1F1A2A', mint: '#227E56',
    amber: '#975C12', rose: '#B83A54', action: '#DCCFF5', actionForeground: '#271B3E',
  });
}

export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  display: 'Manrope_600SemiBold',
  displayBold: 'Manrope_700Bold',
  brand: 'GreatVibes_400Regular',
};

export type MainTab = 'home' | 'ais' | 'finance' | 'chat' | 'assistant' | 'profile';
export type PinnedSpecialist = 'finance' | 'assistant';
export type AppScreen = MainTab | 'notifications' | 'pricing' | 'admin';
