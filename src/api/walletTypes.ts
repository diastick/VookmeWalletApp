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
  promoSummary: WalletAppPromoSummaryDto;
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
  cardUrl: string;
  qrPayload: string;
  memberCode?: string;
  codeLast4: string;
  storePhoneDisplay?: string;
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
  redeemCode: string;
  publicCardUrl: string;
  qrPayload: string;
  initialAmount: number;
  balanceAmount: number;
  statusText: string;
  issuedAtUtc: string;
  expiresAtUtc?: string | null;
  storePhoneDisplay?: string;
}

export interface WalletAppPromoSummaryDto {
  totalCount: number;
  activeCount: number;
  offers: WalletAppPromoOfferDto[];
}

export interface WalletAppPromoOfferDto {
  customerOfferId: number;
  storeId: number;
  storeName: string;
  offerName: string;
  benefitText: string;
  code: string;
  qrPayload: string;
  channelText: string;
  issuedAtUtc: string;
  expiresAtUtc?: string | null;
  isInStoreRedeemable: boolean;
  isOnlineOrderRedeemable: boolean;
  isReservationRedeemable: boolean;
  storePhoneDisplay?: string;
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
  codeLast4?: string | null;
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
  promosEnabled: boolean;
}
