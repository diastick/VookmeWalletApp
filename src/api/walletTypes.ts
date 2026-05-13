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


export interface WalletAppUpdateProfileRequest {
  displayName: string;
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
  phoneDisplay?: string;
  emailDisplay?: string;
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
  localNetworks: WalletAppLocalNetworkDto[];
  campaignProgress: WalletAppCampaignProgressDto[];
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
  displayName?: string;
  displaySubtitle?: string;
  canUseAtText?: string;
  isNetworkReward?: boolean;
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
  availableOfferCount?: number;
  availableOffers?: WalletAppAvailableOfferDto[];
}

export interface WalletAppPromoOfferDto {
  customerOfferId: number;
  storeId: number;
  storeName: string;
  offerId?: number;
  offerName: string;
  benefitText: string;
  code: string;
  qrPayload: string;
  channelText: string;
  issuedReason?: string;
  issuedAtUtc: string;
  expiresAtUtc?: string | null;
  isInStoreRedeemable: boolean;
  isOnlineOrderRedeemable: boolean;
  isReservationRedeemable: boolean;
  storePhoneDisplay?: string;
}

export interface WalletAppAvailableOfferDto {
  offerId: number;
  storeId: number;
  storeName: string;
  offerName: string;
  benefitText: string;
  summary: string;
  description: string;
  terms: string;
  actionText: string;
  channelText: string;
  startDateUtc?: string | null;
  endDateUtc?: string | null;
  requiresCustomerTracking: boolean;
  requiresClaim: boolean;
  firstVisitOnly: boolean;
  alreadyInWallet: boolean;
  alreadyRedeemed: boolean;
  limitPerCustomer: number;
  redemptionCount: number;
  isInStoreRedeemable: boolean;
  isOnlineOrderRedeemable: boolean;
  isReservationRedeemable: boolean;
  storePhoneDisplay?: string;
  websiteUrl?: string;
  homeUrl?: string;
  displayOrder: number;
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

export interface WalletAppLocalNetworkDto {
  networkId: number;
  networkName: string;
  displayName: string;
  headline: string;
  description: string;
  areaText: string;
  storeCount: number;
  availablePoints: number;
  availableRewardValue: number;
  isPrimary: boolean;
  featuredStores: WalletAppStoreDto[];
}

export interface WalletAppCampaignProgressDto {
  campaignId: number;
  campaignName: string;
  networkId?: number | null;
  networkName: string;
  description: string;
  progressText: string;
  progressCount: number;
  requiredCount: number;
  pointsEarned: number;
  rewardValueEarned: number;
  isCompleted: boolean;
  expiresAtUtc?: string | null;
}

export interface WalletAppQrResponse {
  qrToken: string;
  scanUrl: string;
  qrPurpose?: string;
  displayTitle?: string;
  displaySubtitle?: string;
  supportedScanTargets?: string[];
  expiresAtUtc: string;
  validForSeconds: number;
  refreshAfterSeconds: number;
}

export interface WalletAppStoreDto {
  storeId: number;
  storeName: string;
  businessTypeName: string;
  networkId?: number | null;
  networkName?: string;
  networkDisplayName?: string;
  cityState: string;
  phoneDisplay: string;
  websiteUrl: string;
  homeUrl: string;
  orderUrl: string;
  reservationUrl: string;
  rewardsEnabled: boolean;
  giftCardsEnabled: boolean;
  promosEnabled: boolean;
  earnHere?: boolean;
  redeemHere?: boolean;
  currentOffer?: string;
  isFeatured?: boolean;
  displayOrder?: number;
}

export interface WalletAppRewardTicketDetailDto {
  code: string;
  storeId: number;
  storeName: string;
  rewardName: string;
  points: number;
  rewardValue: number;
  thankYouMessage: string;
  expiresAtUtc?: string | null;
  status: string;
  statusText: string;
  canAddToWallet: boolean;
  alreadyAddedToWallet: boolean;
  ticketNumber: number;
}

export interface WalletAppRewardTicketClaimResponseDto {
  added: boolean;
  alreadyAdded: boolean;
  pointsAdded: number;
  balanceAfter: number;
  balanceValueAfter: number;
  ticket: WalletAppRewardTicketDetailDto;
}
