import { Platform } from 'react-native';

const defaultApiBaseUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api/v1'
  : 'http://127.0.0.1:8000/api/v1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl;

export const colors = {
  ink: '#0C0B11',
  panel: '#17151F',
  raised: '#201D2B',
  line: '#302B3D',
  muted: '#9A94A8',
  lilac: '#C7A8FF',
  mint: '#80DDB4',
  amber: '#FFD28A',
  rose: '#FF9DAE',
};

export type MainTab = 'home' | 'finance' | 'chat' | 'assistant' | 'profile';
export type AppScreen = MainTab | 'notifications' | 'pricing' | 'admin';
