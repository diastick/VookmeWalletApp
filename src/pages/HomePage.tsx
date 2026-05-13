import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { closeOutline, logOutOutline, ticketOutline } from 'ionicons/icons';
import { QRCodeSVG } from 'qrcode.react';
import { walletApi } from '../api/walletApi';
import { WalletAppActivityDto, WalletAppGiftCardSummaryDto, WalletAppHomeResponse } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

type WalletFilter = 'all' | 'rewards' | 'giftcards';
type PassKind = 'reward' | 'giftcard' | 'promo';

interface WalletPass {
  id: string;
  kind: PassKind;
  title: string;
  storeName: string;
  subtitle: string;
  value: string;
  meta: string;
  codeLabel: string;
  code: string;
  qrPayload: string;
  expiresText: string;
  storePhoneDisplay: string;
  theme: string;
  useNote: string;
}

const rewardThemes = [
  'reward-pass reward-pass-green',
  'reward-pass reward-pass-blue',
  'reward-pass reward-pass-teal',
  'reward-pass reward-pass-indigo',
  'reward-pass reward-pass-emerald',
  'reward-pass reward-pass-cyan',
  'reward-pass reward-pass-navy',
];
const giftThemes = ['gift-pass gift-pass-purple', 'gift-pass gift-pass-gold', 'gift-pass gift-pass-rose', 'gift-pass gift-pass-violet'];
const INITIAL_ACTIVITY_COUNT = 8;
const ACTIVITY_INCREMENT = 8;

const money = (value: number): string => `$${Number(value || 0).toFixed(2)}`;
const formatLongDate = (value?: string | null): string => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const formatExpiry = (value?: string | null): string => value ? `Expires ${formatLongDate(value)}` : 'No expiration shown';
const safeLower = (value?: string | null): string => (value ?? '').toLowerCase();
const compactKey = (value?: string | null): string => safeLower(value).replace(/[^a-z0-9]+/g, '');

const hashText = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const pickTheme = (themes: string[], seed: string | number | null | undefined): string => {
  const value = String(seed ?? 'wallet-card');
  return themes[hashText(value) % themes.length];
};

const sourceKey = (source?: string | null): PassKind => {
  const value = safeLower(source);
  if (value.includes('gift')) return 'giftcard';
  if (value.includes('promo') || value.includes('offer')) return 'promo';
  return 'reward';
};

const formatActivityDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const isInternalNote = (value?: string | null): boolean => {
  const text = safeLower(value);
  return [
    'dashboard',
    'manual',
    'staff',
    'admin',
    'batch',
    'ticket',
    'ledger',
    'billing',
    'clearing',
    'created by',
    'issued by',
  ].some((keyword) => text.includes(keyword));
};

const activityTitle = (row: WalletAppActivityDto): string => {
  const key = sourceKey(row.source);
  const type = safeLower(row.typeText);
  const points = row.pointDelta ?? 0;
  const amount = Math.abs(row.amount ?? 0);

  if (key === 'reward') {
    if (points > 0) return `Earned ${points} pts`;
    if (points < 0) return `Used ${Math.abs(points)} pts`;
    if (type.includes('refund') || type.includes('reverse')) return 'Reward adjusted';
    return 'Reward updated';
  }

  if (key === 'giftcard') {
    if (type.includes('redeem') || type.includes('used')) return `Gift card used ${amount ? money(amount) : ''}`.trim();
    if (type.includes('refund')) return `Gift card refunded ${amount ? money(amount) : ''}`.trim();
    if (type.includes('void') || type.includes('cancel')) return 'Gift card canceled';
    if (type.includes('adjust')) return `Gift card adjusted ${amount ? money(amount) : ''}`.trim();
    return `Gift card added ${amount ? money(amount) : ''}`.trim();
  }

  if (type.includes('redeem') || type.includes('used')) return 'Promo redeemed';
  if (type.includes('expired')) return 'Promo expired';
  if (type.includes('cancel') || type.includes('revoked')) return 'Promo canceled';
  return 'Promo added';
};

const activityMatchesPass = (row: WalletAppActivityDto, pass: WalletPass): boolean => {
  if (sourceKey(row.source) !== pass.kind) return false;

  const rowStore = compactKey(row.storeName);
  const passStore = compactKey(pass.storeName);
  if (rowStore && passStore && rowStore === passStore) return true;

  if (pass.kind === 'promo' && row.codeLast4 && pass.code) {
    return pass.code.endsWith(row.codeLast4);
  }

  if (pass.kind === 'reward' && passStore.includes('vookmeglobal')) return true;

  return false;
};

const HomePage: React.FC = () => {
  const { apiBaseUrl, authFetch, logout, customer } = useWalletAuth();
  const [home, setHome] = useState<WalletAppHomeResponse | null>(null);
  const [activityRows, setActivityRows] = useState<WalletAppActivityDto[]>([]);
  const [visibleActivityCounts, setVisibleActivityCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<WalletFilter>('all');
  const [selectedPassId, setSelectedPassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const loadHome = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError('');

    try {
      const response = await authFetch((token) => walletApi.home(apiBaseUrl, token));
      const baseHome = response.data ?? null;

      if (!baseHome) {
        setHome(null);
        setActivityRows([]);
        return;
      }

      let giftCardSummary: WalletAppGiftCardSummaryDto = baseHome.giftCardSummary ?? { totalCount: 0, activeCount: 0, totalBalance: 0, cards: [] };

      try {
        const giftResponse = await authFetch((token) => walletApi.giftCards(apiBaseUrl, token));
        if (giftResponse.data) giftCardSummary = giftResponse.data;
      } catch {
        // Keep the home summary if the detail endpoint is temporarily unavailable.
      }

      setHome({
        ...baseHome,
        giftCardSummary,
      });

      try {
        const activityResponse = await authFetch((token) => walletApi.activity(apiBaseUrl, token, 80));
        setActivityRows(Array.isArray(activityResponse.data) ? activityResponse.data : []);
      } catch {
        setActivityRows(Array.isArray(baseHome.recentActivities) ? baseHome.recentActivities : []);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet could not be loaded.';
      setLoadError(message);
      if (showLoading) setToastMessage(message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authFetch]);

  useEffect(() => { void loadHome(true); }, [loadHome]);

  const handleRefresh = async (event: CustomEvent) => {
    await loadHome(false);
    event.detail.complete();
  };

  const rewardSummary = home?.rewardSummary;
  const giftCardSummary = home?.giftCardSummary;
  const passes = useMemo<WalletPass[]>(() => {
    const rewardPasses = (rewardSummary?.accounts ?? []).map((account): WalletPass => {
      const qrPayload = account.qrPayload || account.cardUrl || '';
      const memberCode = account.memberCode || (account.codeLast4 ? `Member # ${account.codeLast4}` : '');
      const themeSeed = account.storeId ?? account.networkId ?? account.rewardAccountId;
      return {
        id: `reward-${account.rewardAccountId}`,
        kind: 'reward',
        title: account.displayName || account.storeName || account.networkName || 'Vookme Rewards',
        storeName: account.storeName || account.networkName || 'Vookme Rewards',
        subtitle: account.displaySubtitle || account.scopeLabel || 'Reward account',
        value: `${account.pointBalance ?? 0} pts`,
        meta: `${money(account.rewardValue ?? 0)} available`,
        codeLabel: 'Member #',
        code: memberCode,
        qrPayload,
        expiresText: 'No expiration shown',
        storePhoneDisplay: account.storePhoneDisplay || '',
        theme: account.isNetworkReward ? pickTheme(rewardThemes, `network-${themeSeed}`) : pickTheme(rewardThemes, `reward-${themeSeed}`),
        useNote: account.canUseAtText || 'Show this QR or member number at the store.',
      };
    });

    const giftPasses = (giftCardSummary?.cards ?? []).map((card): WalletPass => ({
      id: `gift-${card.giftCardId}`,
      kind: 'giftcard',
      title: card.storeName || 'Gift Card',
      storeName: card.storeName || 'Gift Card',
      subtitle: card.statusText || 'Gift Card',
      value: money(card.balanceAmount ?? 0),
      meta: `Original ${money(card.initialAmount ?? 0)}`,
      codeLabel: 'Gift card code',
      code: card.redeemCode || (card.codeLast4 ? `Ending ${card.codeLast4}` : ''),
      qrPayload: card.qrPayload || card.redeemCode || card.publicCardUrl || '',
      expiresText: formatExpiry(card.expiresAtUtc),
      storePhoneDisplay: card.storePhoneDisplay || '',
      theme: pickTheme(giftThemes, `gift-${card.storeId}-${card.giftCardId}`),
      useNote: 'Show this QR or code to use your gift card.',
    }));

    const all = [...rewardPasses, ...giftPasses];
    if (filter === 'rewards') return all.filter((x) => x.kind === 'reward');
    if (filter === 'giftcards') return all.filter((x) => x.kind === 'giftcard');
    return all;
  }, [filter, giftCardSummary?.cards, rewardSummary?.accounts]);

  useEffect(() => {
    if (selectedPassId && !passes.some((pass) => pass.id === selectedPassId)) {
      setSelectedPassId('');
    }
  }, [passes, selectedPassId]);

  // Prefer the context customer because Profile updates refresh this value immediately.
  // home.customer can be stale until the Wallet tab is reloaded.
  const displayCustomer = customer ?? home?.customer;

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Wallet</IonTitle>
          <IonButton slot="end" fill="clear" onClick={logout} aria-label="Logout"><IonIcon icon={logOutOutline} /></IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="wallet-page-bg wallet-page-wallet-stack">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}><IonRefresherContent /></IonRefresher>
        <div className="wallet-content-wrap wallet-stack-wrap">
          <div className="wallet-stack-header">
            <div>
              <span className="wallet-eyebrow wallet-eyebrow-dark">Vookme Wallet</span>
              <h1>{displayCustomer?.displayName || 'My Wallet'}</h1>
              <p>Tap a card to show the QR, code, and recent activity.</p>
            </div>
            <IonButton routerLink="/wallet/ticket-scan" fill="outline" size="small" className="wallet-scan-ticket-link">
              <IonIcon icon={ticketOutline} slot="start" />
              Scan
            </IonButton>
          </div>

          {loadError && !loading && (
            <IonCard className="wallet-card wallet-error-card">
              <IonCardContent>
                <IonText color="danger"><h2>Wallet could not be loaded</h2></IonText>
                <p>{loadError}</p>
                <IonButton expand="block" onClick={() => loadHome(true)}>Try again</IonButton>
              </IonCardContent>
            </IonCard>
          )}

          <IonSegment value={filter} onIonChange={(event) => setFilter((event.detail.value as WalletFilter) || 'all')} className="wallet-filter-segment wallet-pass-filter-segment">
            <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="rewards"><IonLabel>Rewards</IonLabel></IonSegmentButton>
            <IonSegmentButton value="giftcards"><IonLabel>Gift Cards</IonLabel></IonSegmentButton>
          </IonSegment>

          {loading && <IonSkeletonText animated className="wallet-pass-skeleton" />}
          {!loading && passes.length === 0 && !loadError && (
            <IonCard className="wallet-card"><IonCardContent><IonText color="medium">No wallet cards found yet.</IonText></IonCardContent></IonCard>
          )}

          {!loading && passes.length > 0 && (
            <div className="wallet-pass-stack wallet-pass-stack-overlap">
              {passes.map((pass, index) => {
                const expanded = selectedPassId === pass.id;
                const passActivities = activityRows.filter((row) => activityMatchesPass(row, pass));
                const visibleCount = visibleActivityCounts[pass.id] ?? INITIAL_ACTIVITY_COUNT;
                const visibleActivities = passActivities.slice(0, visibleCount);
                const hasMoreActivities = passActivities.length > visibleCount;

                return (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={expanded}
                    className={`wallet-pass ${pass.theme} ${expanded ? 'wallet-pass-expanded' : ''}`}
                    key={pass.id}
                    style={{ zIndex: expanded ? 100 + passes.length : index + 1 }}
                    onClick={() => setSelectedPassId(expanded ? '' : pass.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedPassId(expanded ? '' : pass.id);
                      }
                    }}
                  >
                    {expanded && (
                      <IonButton
                        fill="clear"
                        size="small"
                        className="wallet-pass-close-button"
                        aria-label="Close card"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedPassId('');
                        }}
                      >
                        <IonIcon icon={closeOutline} />
                      </IonButton>
                    )}

                    <div className="wallet-pass-main-row">
                      <div className="wallet-pass-title-block">
                        <h2>{pass.title}</h2>
                        {expanded && <p>{pass.subtitle}</p>}
                      </div>
                      <div className="wallet-pass-value-block">
                        <strong>{pass.value}</strong>
                        {expanded && <span>{pass.meta}</span>}
                      </div>
                    </div>

                    {expanded && (
                      <div className="wallet-pass-expanded-body" onClick={(event) => event.stopPropagation()}>
                        <div className="wallet-pass-qr-area">
                          {pass.qrPayload ? (
                            <QRCodeSVG value={pass.qrPayload} size={146} level="M" includeMargin />
                          ) : (
                            <IonText color="medium">QR is not available for this card.</IonText>
                          )}
                        </div>
                        <div className="wallet-pass-detail-grid wallet-pass-detail-grid-compact">
                          <div>
                            <span>{pass.codeLabel}</span>
                            <strong>{pass.code || 'Not available'}</strong>
                          </div>
                          <div>
                            <span>Expiration</span>
                            <strong>{pass.expiresText}</strong>
                          </div>
                          <div>
                            <span>Store phone</span>
                            <strong>{pass.storePhoneDisplay || 'Not shown'}</strong>
                          </div>
                        </div>
                        <p className="wallet-pass-use-note">{pass.useNote}</p>

                        <div className="wallet-pass-activity-panel">
                          <div className="wallet-pass-activity-title-row">
                            <h3>Recent Activity</h3>
                            <span>{passActivities.length > 0 ? `${Math.min(visibleCount, passActivities.length)} of ${passActivities.length}` : ''}</span>
                          </div>

                          {visibleActivities.length === 0 && (
                            <p className="wallet-pass-empty-activity">No recent activity for this card yet.</p>
                          )}

                          {visibleActivities.map((row, activityIndex) => {
                            const note = !isInternalNote(row.note) ? row.note : '';
                            return (
                              <div className="wallet-pass-activity-row" key={`${pass.id}-${row.createdAtUtc}-${activityIndex}`}>
                                <div>
                                  <strong>{activityTitle(row)}</strong>
                                  <span>{note || row.storeName || pass.storeName}</span>
                                </div>
                                <time>{formatActivityDate(row.createdAtUtc)}</time>
                              </div>
                            );
                          })}

                          {hasMoreActivities && (
                            <IonButton
                              fill="clear"
                              size="small"
                              className="wallet-pass-view-more-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setVisibleActivityCounts((current) => ({
                                  ...current,
                                  [pass.id]: visibleCount + ACTIVITY_INCREMENT,
                                }));
                              }}
                            >
                              View more
                            </IonButton>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <IonToast isOpen={Boolean(toastMessage)} message={toastMessage} duration={2600} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
