export interface WalletAppApiResponse<T> {
  success: boolean;
  message: string;
  data?: T | null;
}

export interface WalletAppPagedResponse<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  rows: T[];
}

export interface WalletAppRequestCodeRequest {
  phoneOrEmail: string;
  method?: 'email' | 'sms' | '';
}

export interface WalletAppRequestCodeResponse {
  verificationToken: string;
  method: string;
  destinationMasked: string;
  expiresAtUtc: string;
}

export interface WalletAppVerifyCodeRequest {
  verificationToken: string;
  code: string;
}

export interface WalletAppRefreshTokenRequest {
  refreshToken: string;
}

export interface WalletAppTokenResponse {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  customer: WalletAppCustomerDto;
}

export interface WalletAppCustomerDto {
  rewardMemberId: number;
  displayName: string;
  phoneMasked: string;
  emailMasked: string;
  smsOptIn: boolean;
  emailOptIn: boolean;
}

export interface WalletAppHomeResponse {
  customer: WalletAppCustomerDto;
  rewardSummary: WalletAppRewardSummaryDto;
  giftCardSummary: WalletAppGiftCardSummaryDto;
  recentActivities: WalletAppActivityDto[];
  favoriteStores: WalletAppStoreDto[];
  qrAvailable: boolean;
}

export interface WalletAppRewardSummaryDto {
  totalPoints: number;
  totalRewardValue: number;
  accountCount: number;
  accounts: WalletAppRewardAccountDto[];
}

export interface WalletAppRewardAccountDto {
  rewardAccountId: number;
  storeId?: number | null;
  storeName: string;
  networkId?: number | null;
  networkName: string;
  scopeLabel: string;
  pointBalance: number;
  rewardValue: number;
}

export interface WalletAppGiftCardSummaryDto {
  totalCount: number;
  activeCount: number;
  totalBalance: number;
  cards: WalletAppGiftCardDto[];
}

export interface WalletAppGiftCardDto {
  giftCardId: number;
  storeId: number;
  storeName: string;
  codeLast4: string;
  initialAmount: number;
  balanceAmount: number;
  statusText: string;
  issuedAtUtc: string;
  expiresAtUtc?: string | null;
}

export interface WalletAppActivityDto {
  source: string;
  typeText: string;
  storeName: string;
  pointDelta?: number | null;
  amount?: number | null;
  balanceAfter?: number | null;
  note: string;
  createdAtUtc: string;
}

export interface WalletAppQrResponse {
  qrToken: string;
  scanUrl: string;
  expiresAtUtc: string;
  validForSeconds: number;
  refreshAfterSeconds: number;
}

export interface WalletAppStoreDto {
  storeId: number;
  storeName: string;
  businessTypeName: string;
  cityState: string;
  phoneDisplay: string;
  websiteUrl: string;
  homeUrl: string;
  orderUrl: string;
  reservationUrl: string;
  rewardsEnabled: boolean;
  giftCardsEnabled: boolean;
}
