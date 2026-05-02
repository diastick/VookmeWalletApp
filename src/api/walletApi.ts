import {
  WalletAppActivityDto,
  WalletAppApiResponse,
  WalletAppGiftCardSummaryDto,
  WalletAppHomeResponse,
  WalletAppPagedResponse,
  WalletAppPromoSummaryDto,
  WalletAppQrResponse,
  WalletAppRefreshTokenRequest,
  WalletAppRequestCodeRequest,
  WalletAppRequestCodeResponse,
  WalletAppRewardSummaryDto,
  WalletAppStoreDto,
  WalletAppTokenResponse,
  WalletAppVerifyCodeRequest,
} from './walletTypes';

export class WalletApiError extends Error {
  public readonly status: number;
  public readonly apiMessage?: string;

  constructor(message: string, status: number, apiMessage?: string) {
    super(message);
    this.name = 'WalletApiError';
    this.status = status;
    this.apiMessage = apiMessage;
  }
}

const REQUEST_TIMEOUT_MS = 12000;
const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');
const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

const isTransientFetchError = (error: unknown): boolean => {
  if (error instanceof WalletApiError) return false;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('load failed') || message.includes('aborted') || message.includes('timeout');
};

const mergeSignals = (timeoutMs: number, externalSignal?: AbortSignal | null): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort('timeout'), timeoutMs);

  const onAbort = () => {
    if (!controller.signal.aborted) controller.abort(externalSignal?.reason ?? 'aborted');
  };

  if (externalSignal) {
    if (externalSignal.aborted) onAbort();
    else externalSignal.addEventListener('abort', onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onAbort);
    },
  };
};

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
  retryTransient = true
): Promise<WalletAppApiResponse<T>> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');
  headers.set('Cache-Control', 'no-cache');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const { signal, cleanup } = mergeSignals(REQUEST_TIMEOUT_MS, options.signal);

  try {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
      ...options,
      headers,
      signal,
      cache: 'no-store',
    });

    let payload: WalletAppApiResponse<T> | null = null;
    const text = await response.text();

    if (text) {
      try {
        payload = JSON.parse(text) as WalletAppApiResponse<T>;
      } catch {
        throw new WalletApiError('The server returned an invalid response.', response.status);
      }
    }

    if (!response.ok || !payload) {
      const apiMessage = payload?.message;
      throw new WalletApiError(apiMessage || `Request failed with status ${response.status}.`, response.status, apiMessage);
    }

    if (!payload.success) {
      throw new WalletApiError(payload.message || 'The request was not successful.', response.status, payload.message);
    }

    return payload;
  } catch (error) {
    if (retryTransient && isTransientFetchError(error)) {
      await sleep(850);
      return request<T>(baseUrl, path, options, accessToken, false);
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new WalletApiError('The wallet server did not respond. Please try again.', 408);
    }

    throw error;
  } finally {
    cleanup();
  }
}

export const walletApi = {
  requestCode(baseUrl: string, requestBody: WalletAppRequestCodeRequest) {
    return request<WalletAppRequestCodeResponse>(baseUrl, '/api/wallet/auth/request-code', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },

  verifyCode(baseUrl: string, requestBody: WalletAppVerifyCodeRequest) {
    return request<WalletAppTokenResponse>(baseUrl, '/api/wallet/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },

  refresh(baseUrl: string, requestBody: WalletAppRefreshTokenRequest) {
    return request<WalletAppTokenResponse>(baseUrl, '/api/wallet/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },

  logout(baseUrl: string, accessToken: string) {
    return request<{ success: boolean }>(baseUrl, '/api/wallet/auth/logout', { method: 'POST' }, accessToken);
  },

  home(baseUrl: string, accessToken: string) {
    return request<WalletAppHomeResponse>(baseUrl, '/api/wallet/home', { method: 'GET' }, accessToken);
  },

  activity(baseUrl: string, accessToken: string) {
    return request<WalletAppActivityDto[]>(baseUrl, '/api/wallet/activity', { method: 'GET' }, accessToken);
  },

  qr(baseUrl: string, accessToken: string) {
    return request<WalletAppQrResponse>(baseUrl, '/api/wallet/qr', { method: 'GET' }, accessToken);
  },

  rewards(baseUrl: string, accessToken: string) {
    return request<WalletAppRewardSummaryDto>(baseUrl, '/api/wallet/rewards', { method: 'GET' }, accessToken);
  },

  giftCards(baseUrl: string, accessToken: string) {
    return request<WalletAppGiftCardSummaryDto>(baseUrl, '/api/wallet/giftcards', { method: 'GET' }, accessToken);
  },

  promos(baseUrl: string, accessToken: string) {
    return request<WalletAppPromoSummaryDto>(baseUrl, '/api/wallet/promos', { method: 'GET' }, accessToken);
  },

  stores(baseUrl: string, accessToken: string, q = '', location = '', page = 1, pageSize = 20) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (q.trim()) params.set('q', q.trim());
    if (location.trim()) params.set('location', location.trim());
    return request<WalletAppPagedResponse<WalletAppStoreDto>>(baseUrl, `/api/wallet/stores?${params.toString()}`, { method: 'GET' }, accessToken);
  },
};
