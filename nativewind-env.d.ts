/// <reference types="nativewind/types" />
declare module '*.css';

declare const process: {
  env: { EXPO_PUBLIC_API_BASE_URL?: string };
};
