import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import {
  DEFAULT_API_BASE_URL,
  WALLET_ACCESS_TOKEN_STORAGE_KEY,
  WALLET_API_BASE_URL_STORAGE_KEY,
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
  requestCode: (phoneOrEmail: string, method: 'email' | 'sms' | '') => Promise<WalletAppRequestCodeResponse>;
  verifyCode: (verificationToken: string, code: string) => Promise<WalletAppTokenResponse>;
  refreshAccessToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  authFetch: <T>(callback: (token: string) => Promise<T>) => Promise<T>;
}

const WalletAuthContext = createContext<WalletAuthContextValue | undefined>(undefined);
const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

const isTransientNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('load failed');
};

const readPreference = async (key: string, fallback = ''): Promise<string> => {
  const result = await Preferences.get({ key });
  return result.value ?? fallback;
};

const writePreference = async (key: string, value: string): Promise<void> => {
  await Preferences.set({ key, value });
};

const removePreference = async (key: string): Promise<void> => {
  await Preferences.remove({ key });
};

const normalizeApiBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.replace(/\/+$/, '') || DEFAULT_API_BASE_URL;
};

export const WalletAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [apiBaseUrl, setApiBaseUrlState] = useState(DEFAULT_API_BASE_URL);
  const [customer, setCustomer] = useState<WalletAppCustomerDto | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [storedBaseUrl, storedAccessToken, storedRefreshToken] = await Promise.all([
        readPreference(WALLET_API_BASE_URL_STORAGE_KEY, DEFAULT_API_BASE_URL),
        readPreference(WALLET_ACCESS_TOKEN_STORAGE_KEY),
        readPreference(WALLET_REFRESH_TOKEN_STORAGE_KEY),
      ]);

      if (!mounted) return;

      const normalizedBaseUrl = normalizeApiBaseUrl(storedBaseUrl);
      setApiBaseUrlState(normalizedBaseUrl);
      setRefreshToken(storedRefreshToken);

      if (storedRefreshToken) {
        try {
          const response = await walletApi.refresh(normalizedBaseUrl, { refreshToken: storedRefreshToken });
          if (mounted && response.data) {
            setAccessToken(response.data.accessToken);
            setRefreshToken(response.data.refreshToken);
            setCustomer(response.data.customer);
            await Promise.all([
              writePreference(WALLET_ACCESS_TOKEN_STORAGE_KEY, response.data.accessToken),
              writePreference(WALLET_REFRESH_TOKEN_STORAGE_KEY, response.data.refreshToken),
            ]);
          }
        } catch {
          if (mounted) setAccessToken(storedAccessToken);
        }
      } else {
        setAccessToken(storedAccessToken);
      }

      if (mounted) setInitialized(true);
    };

    void load();
    return () => { mounted = false; };
  }, []);

  const persistTokens = useCallback(async (tokens: WalletAppTokenResponse) => {
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    setCustomer(tokens.customer);
    await Promise.all([
      writePreference(WALLET_ACCESS_TOKEN_STORAGE_KEY, tokens.accessToken),
      writePreference(WALLET_REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken),
    ]);
  }, []);

  const setApiBaseUrl = useCallback(async (value: string) => {
    const normalized = normalizeApiBaseUrl(value);
    setApiBaseUrlState(normalized);
    await writePreference(WALLET_API_BASE_URL_STORAGE_KEY, normalized);
  }, []);

  const requestCode = useCallback(async (phoneOrEmail: string, method: 'email' | 'sms' | '') => {
    const response = await walletApi.requestCode(apiBaseUrl, { phoneOrEmail, method });
    if (!response.data) throw new WalletApiError(response.message || 'Verification code could not be requested.', 400, response.message);
    return response.data;
  }, [apiBaseUrl]);

  const verifyCode = useCallback(async (verificationToken: string, code: string) => {
    const response = await walletApi.verifyCode(apiBaseUrl, { verificationToken, code });
    if (!response.data) throw new WalletApiError(response.message || 'Verification failed.', 400, response.message);
    await persistTokens(response.data);
    return response.data;
  }, [apiBaseUrl, persistTokens]);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) return null;
    try {
      const response = await walletApi.refresh(apiBaseUrl, { refreshToken });
      if (!response.data) return null;
      await persistTokens(response.data);
      return response.data.accessToken;
    } catch {
      return null;
    }
  }, [apiBaseUrl, persistTokens, refreshToken]);

  const logout = useCallback(async () => {
    if (accessToken) {
      try { await walletApi.logout(apiBaseUrl, accessToken); } catch { }
    }
    setAccessToken('');
    setRefreshToken('');
    setCustomer(null);
    await Promise.all([
      removePreference(WALLET_ACCESS_TOKEN_STORAGE_KEY),
      removePreference(WALLET_REFRESH_TOKEN_STORAGE_KEY),
    ]);
  }, [accessToken, apiBaseUrl]);

  const authFetch = useCallback(async <T,>(callback: (token: string) => Promise<T>): Promise<T> => {
    if (!accessToken) throw new WalletApiError('Please sign in again.', 401);
    try {
      return await callback(accessToken);
    } catch (error) {
      if (error instanceof WalletApiError && error.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) return await callback(newToken);
      }
      if (isTransientNetworkError(error)) {
        await sleep(850);
        return await callback(accessToken);
      }
      throw error;
    }
  }, [accessToken, refreshAccessToken]);

  const value = useMemo<WalletAuthContextValue>(() => ({
    accessToken, refreshToken, apiBaseUrl, customer, initialized,
    isAuthenticated: Boolean(accessToken), setApiBaseUrl, requestCode, verifyCode,
    refreshAccessToken, logout, authFetch,
  }), [accessToken, refreshToken, apiBaseUrl, customer, initialized, setApiBaseUrl, requestCode, verifyCode, refreshAccessToken, logout, authFetch]);

  return <WalletAuthContext.Provider value={value}>{children}</WalletAuthContext.Provider>;
};

export const useWalletAuth = (): WalletAuthContextValue => {
  const context = useContext(WalletAuthContext);
  if (!context) throw new Error('useWalletAuth must be used inside WalletAuthProvider.');
  return context;
};
