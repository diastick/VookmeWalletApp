import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import {
  DEFAULT_API_BASE_URL,
  WALLET_ACCESS_TOKEN_STORAGE_KEY,
  WALLET_API_BASE_URL_STORAGE_KEY,
  WALLET_CUSTOMER_STORAGE_KEY,
  WALLET_REFRESH_TOKEN_STORAGE_KEY,
} from '../config/walletConfig';
import { walletApi, WalletApiError } from '../api/walletApi';
import {
  WalletAppCustomerDto,
  WalletAppRequestCodeResponse,
  WalletAppTokenResponse,
} from '../api/walletTypes';

interface WalletAuthContextValue {
  accessToken: string;
  refreshToken: string;
  apiBaseUrl: string;
  customer: WalletAppCustomerDto | null;
  initialized: boolean;
  isAuthenticated: boolean;
  setApiBaseUrl: (value: string) => Promise<void>;
  updateCustomerProfile: (displayName: string) => Promise<WalletAppCustomerDto>;
  requestCode: (phoneOrEmail: string, method: 'email' | 'sms' | '') => Promise<WalletAppRequestCodeResponse>;
  verifyCode: (verificationToken: string, code: string) => Promise<WalletAppTokenResponse>;
  refreshAccessToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  authFetch: <T>(callback: (token: string) => Promise<T>) => Promise<T>;
}

const WalletAuthContext = createContext<WalletAuthContextValue | undefined>(undefined);
const INIT_WATCHDOG_MS = 4500;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

const isTransientNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('load failed') || message.includes('aborted') || message.includes('timeout');
};

const readPreference = async (key: string, fallback = ''): Promise<string> => {
  try {
    const result = await Preferences.get({ key });
    return result.value ?? fallback;
  } catch {
    return fallback;
  }
};

const writePreference = async (key: string, value: string): Promise<void> => {
  try {
    await Preferences.set({ key, value });
  } catch {
    // Storage failure should not freeze the wallet UI.
  }
};

const removePreference = async (key: string): Promise<void> => {
  try {
    await Preferences.remove({ key });
  } catch {
    // Ignore storage cleanup errors.
  }
};

const normalizeApiBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.replace(/\/+$/, '') || DEFAULT_API_BASE_URL;
};

const parseStoredCustomer = (value: string): WalletAppCustomerDto | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as WalletAppCustomerDto;
  } catch {
    return null;
  }
};

export const WalletAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [apiBaseUrl, setApiBaseUrlState] = useState(DEFAULT_API_BASE_URL);
  const [customer, setCustomer] = useState<WalletAppCustomerDto | null>(null);
  const [initialized, setInitialized] = useState(false);

  const accessTokenRef = useRef('');
  const refreshTokenRef = useRef('');
  const apiBaseUrlRef = useRef(DEFAULT_API_BASE_URL);

  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);
  useEffect(() => { refreshTokenRef.current = refreshToken; }, [refreshToken]);
  useEffect(() => { apiBaseUrlRef.current = apiBaseUrl; }, [apiBaseUrl]);

  const clearSession = useCallback(async () => {
    setAccessToken('');
    setRefreshToken('');
    setCustomer(null);
    accessTokenRef.current = '';
    refreshTokenRef.current = '';
    await Promise.all([
      removePreference(WALLET_ACCESS_TOKEN_STORAGE_KEY),
      removePreference(WALLET_REFRESH_TOKEN_STORAGE_KEY),
      removePreference(WALLET_CUSTOMER_STORAGE_KEY),
    ]);
  }, []);

  const persistTokens = useCallback(async (tokens: WalletAppTokenResponse) => {
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    setCustomer(tokens.customer);
    accessTokenRef.current = tokens.accessToken;
    refreshTokenRef.current = tokens.refreshToken;

    await Promise.all([
      writePreference(WALLET_ACCESS_TOKEN_STORAGE_KEY, tokens.accessToken),
      writePreference(WALLET_REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken),
      writePreference(WALLET_CUSTOMER_STORAGE_KEY, JSON.stringify(tokens.customer ?? null)),
    ]);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const tokenToRefresh = refreshTokenRef.current || refreshToken;
    if (!tokenToRefresh) return null;

    try {
      const response = await walletApi.refresh(apiBaseUrlRef.current, { refreshToken: tokenToRefresh });
      if (!response.data) return null;
      await persistTokens(response.data);
      return response.data.accessToken;
    } catch {
      return null;
    }
  }, [persistTokens, refreshToken]);

  useEffect(() => {
    let mounted = true;

    const watchdogId = window.setTimeout(() => {
      if (mounted) setInitialized(true);
    }, INIT_WATCHDOG_MS);

    const load = async () => {
      try {
        const [storedBaseUrl, storedAccessToken, storedRefreshToken, storedCustomer] = await Promise.all([
          readPreference(WALLET_API_BASE_URL_STORAGE_KEY, DEFAULT_API_BASE_URL),
          readPreference(WALLET_ACCESS_TOKEN_STORAGE_KEY),
          readPreference(WALLET_REFRESH_TOKEN_STORAGE_KEY),
          readPreference(WALLET_CUSTOMER_STORAGE_KEY),
        ]);

        if (!mounted) return;

        const normalizedBaseUrl = normalizeApiBaseUrl(storedBaseUrl);
        const cachedCustomer = parseStoredCustomer(storedCustomer);

        setApiBaseUrlState(normalizedBaseUrl);
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setCustomer(cachedCustomer);
        apiBaseUrlRef.current = normalizedBaseUrl;
        accessTokenRef.current = storedAccessToken;
        refreshTokenRef.current = storedRefreshToken;

        // Do not block the first screen on refresh. Show wallet/login first, then refresh quietly.
        setInitialized(true);

        if (storedRefreshToken) {
          try {
            const response = await walletApi.refresh(normalizedBaseUrl, { refreshToken: storedRefreshToken });
            if (mounted && response.data) await persistTokens(response.data);
          } catch {
            if (mounted && !storedAccessToken) await clearSession();
          }
        }
      } finally {
        window.clearTimeout(watchdogId);
        if (mounted) setInitialized(true);
      }
    };

    void load();
    return () => {
      mounted = false;
      window.clearTimeout(watchdogId);
    };
  }, [clearSession, persistTokens]);

  const setApiBaseUrl = useCallback(async (value: string) => {
    const normalized = normalizeApiBaseUrl(value);
    setApiBaseUrlState(normalized);
    apiBaseUrlRef.current = normalized;
    await writePreference(WALLET_API_BASE_URL_STORAGE_KEY, normalized);
  }, []);

  const requestCode = useCallback(async (phoneOrEmail: string, method: 'email' | 'sms' | '') => {
    const response = await walletApi.requestCode(apiBaseUrlRef.current, { phoneOrEmail, method });
    if (!response.data) throw new WalletApiError(response.message || 'Verification code could not be requested.', 400, response.message);
    return response.data;
  }, []);

  const verifyCode = useCallback(async (verificationToken: string, code: string) => {
    const response = await walletApi.verifyCode(apiBaseUrlRef.current, { verificationToken, code });
    if (!response.data) throw new WalletApiError(response.message || 'Verification failed.', 400, response.message);
    await persistTokens(response.data);
    return response.data;
  }, [persistTokens]);

  const logout = useCallback(async () => {
    const token = accessTokenRef.current;
    if (token) {
      try { await walletApi.logout(apiBaseUrlRef.current, token); } catch { }
    }
    await clearSession();
  }, [clearSession]);

  const authFetch = useCallback(async <T,>(callback: (token: string) => Promise<T>): Promise<T> => {
    let token = accessTokenRef.current;

    if (!token && refreshTokenRef.current) {
      token = await refreshAccessToken() ?? '';
    }

    if (!token) throw new WalletApiError('Please sign in again.', 401);

    try {
      return await callback(token);
    } catch (error) {
      if (error instanceof WalletApiError && error.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) return await callback(newToken);
        await clearSession();
      }

      if (isTransientNetworkError(error)) {
        await sleep(850);
        const retryToken = accessTokenRef.current || token;
        return await callback(retryToken);
      }

      throw error;
    }
  }, [clearSession, refreshAccessToken]);

  const updateCustomerProfile = useCallback(async (displayName: string) => {
    const response = await authFetch((token) => walletApi.updateProfile(apiBaseUrlRef.current, token, { displayName }));
    if (!response.data) throw new WalletApiError(response.message || 'Profile could not be updated.', 400, response.message);

    setCustomer(response.data);
    await writePreference(WALLET_CUSTOMER_STORAGE_KEY, JSON.stringify(response.data));
    return response.data;
  }, [authFetch]);

  const value = useMemo<WalletAuthContextValue>(() => ({
    accessToken, refreshToken, apiBaseUrl, customer, initialized,
    isAuthenticated: Boolean(accessToken || refreshToken), setApiBaseUrl, updateCustomerProfile, requestCode, verifyCode,
    refreshAccessToken, logout, authFetch,
  }), [accessToken, refreshToken, apiBaseUrl, customer, initialized, setApiBaseUrl, updateCustomerProfile, requestCode, verifyCode, refreshAccessToken, logout, authFetch]);

  return <WalletAuthContext.Provider value={value}>{children}</WalletAuthContext.Provider>;
};

export const useWalletAuth = (): WalletAuthContextValue => {
  const context = useContext(WalletAuthContext);
  if (!context) throw new Error('useWalletAuth must be used inside WalletAuthProvider.');
  return context;
};
