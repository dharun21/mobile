import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config';
import { sessionStorage } from './sessionStorage';

const ACCESS_TOKEN_KEY = 'zengenai-api-access-token';
const USER_KEY = 'zengenai-api-user';
let unauthorizedHandler: (() => void) | undefined;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45_000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await Promise.all([
        sessionStorage.deleteItem(ACCESS_TOKEN_KEY),
        sessionStorage.deleteItem(USER_KEY),
      ]);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

export function setUnauthorizedHandler(handler?: () => void) {
  unauthorizedHandler = handler;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((item) => item?.msg ?? 'Please check this field.').join(' ');
    if (typeof detail === 'string' && detail) return detail;
    if (!error.response) return 'Could not reach ZengenAI. Check your network and API URL.';
  }
  return fallback;
}

export const secureSession = {
  tokenKey: ACCESS_TOKEN_KEY,
  userKey: USER_KEY,
};
