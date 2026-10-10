import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_API_URL_KEY = '@agrimind_api_url';
const STORAGE_COOKIE_KEY = '@agrimind_session_cookie';

export const getDefaultHost = () => {
  if (Platform.OS === 'web') {
    return '/agrimind-api';
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }

  if (Platform.OS === 'android') {
    return 'http://192.168.29.153:3000';
  }

  return 'http://localhost:3000';
};

export const DEFAULT_API_URL = getDefaultHost();

let currentBaseUrl = DEFAULT_API_URL;
let currentSessionCookie = null;

export const initApiConfig = async () => {
  try {
    if (Platform.OS === 'web') {
      currentBaseUrl = '/agrimind-api';
    } else {
      const savedUrl = await AsyncStorage.getItem(STORAGE_API_URL_KEY);
      currentBaseUrl = (
        savedUrl || DEFAULT_API_URL
      ).trim().replace(/\/+$/, '');

      const savedCookie = await AsyncStorage.getItem(STORAGE_COOKIE_KEY);
      currentSessionCookie = savedCookie || null;
    }
  } catch (error) {
    console.warn('Error initializing API configuration:', error);
    currentBaseUrl = DEFAULT_API_URL;
  }
};

export const getApiBaseUrl = () => currentBaseUrl;

export const setApiBaseUrl = async (newUrl) => {
  if (!newUrl || typeof newUrl !== 'string') return;

  const cleanUrl = newUrl.trim().replace(/\/+$/, '');
  currentBaseUrl = cleanUrl;

  try {
    await AsyncStorage.setItem(STORAGE_API_URL_KEY, cleanUrl);
  } catch (error) {
    console.warn('Error saving API URL:', error);
  }
};

export const getSessionCookie = () => currentSessionCookie;

export const setSessionCookie = async (cookieStr) => {
  currentSessionCookie = cookieStr || null;

  try {
    if (currentSessionCookie) {
      await AsyncStorage.setItem(STORAGE_COOKIE_KEY, currentSessionCookie);
    } else {
      await AsyncStorage.removeItem(STORAGE_COOKIE_KEY);
    }
  } catch (error) {
    console.warn('Error persisting session cookie:', error);
  }
};

export const clearSessionCookie = async () => {
  currentSessionCookie = null;

  try {
    await AsyncStorage.removeItem(STORAGE_COOKIE_KEY);
  } catch (error) {
    console.warn('Error clearing session cookie:', error);
  }
};

const api = axios.create({
  timeout: 45000,
  withCredentials: true,
});

export const rootApi = axios.create({
  timeout: 45000,
  withCredentials: true,
});

const setupInterceptors = (instance, isApiRoute = false) => {
  instance.interceptors.request.use(
    (config) => {
      const base = currentBaseUrl.replace(/\/+$/, '');

      config.baseURL = isApiRoute
        ? `${base}/api`
        : base;

      if (Platform.OS !== 'web' && currentSessionCookie) {
        config.headers = config.headers || {};
        config.headers.Cookie = currentSessionCookie;
      }

      config.headers = config.headers || {};
      config.headers.Accept = 'application/json, text/plain, */*';

      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    async (response) => {
      if (Platform.OS !== 'web') {
        const setCookie = response.headers['set-cookie'];

        if (setCookie) {
          const cookieArray = Array.isArray(setCookie)
            ? setCookie
            : [setCookie];

          for (const cookieItem of cookieArray) {
            if (typeof cookieItem !== 'string') continue;

            const match = cookieItem.match(/(?:^|,\s*)(connect\.sid=[^;]+)/);

            if (match && match[1]) {
              await setSessionCookie(match[1]);
              break;
            }
          }
        }
      }

      return response;
    },
    (error) => Promise.reject(error)
  );
};

setupInterceptors(api, true);
setupInterceptors(rootApi, false);

export default api;