import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
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
  IonIcon,
} from '@ionic/react';
import { logOutOutline, ticketOutline } from 'ionicons/icons';
import { QRCodeSVG } from 'qrcode.react';
import { walletApi } from '../api/walletApi';
import { WalletAppGiftCardSummaryDto, WalletAppHomeResponse, WalletAppPromoSummaryDto } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

type WalletFilter = 'all' | 'rewards' | 'giftcards' | 'promos';
type PassKind = 'reward' | 'giftcard' | 'promo';

interface WalletPass {
  id: string;
  kind: PassKind;
  title: string;
  storeName: string;
  subtitle: string;
  value: string;
  meta: string;
  badge: string;
  codeLabel: string;
  code: string;
  qrPayload: string;
  expiresText: string;
  storePhoneDisplay: string;
  theme: string;
  helper: string;
}

const money = (value: number): string => `$${Number(value || 0).toFixed(2)}`;
const formatLongDate = (value?: string | null): string => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const formatExpiry = (value?: string | null): string => value ? `Expires ${formatLongDate(value)}` : 'No expiration shown';

const HomePage: React.FC = () => {
  const { apiBaseUrl, authFetch, logout, customer } = useWalletAuth();
  const [home, setHome] = useState<WalletAppHomeResponse | null>(null);
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
        return;
      }

      let giftCardSummary: WalletAppGiftCardSummaryDto = baseHome.giftCardSummary ?? { totalCount: 0, activeCount: 0, totalBalance: 0, cards: [] };
      let promoSummary: WalletAppPromoSummaryDto = baseHome.promoSummary ?? { totalCount: 0, activeCount: 0, offers: [] };

      try {
        const giftResponse = await authFetch((token) => walletApi.giftCards(apiBaseUrl, token));
        if (giftResponse.data) giftCardSummary = giftResponse.data;
      } catch {
        // Keep the home summary if the detail endpoint is temporarily unavailable.
      }

      try {
        const promoResponse = await authFetch((token) => walletApi.promos(apiBaseUrl, token));
        if (promoResponse.data) promoSummary = promoResponse.data;
      } catch {
        // Keep the home summary if the detail endpoint is temporarily unavailable.
      }

      setHome({
        ...baseHome,
        giftCardSummary,
        promoSummary,
      });
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
  const promoSummary = home?.promoSummary;

  const passes = useMemo<WalletPass[]>(() => {
    const rewardPasses = (rewardSummary?.accounts ?? []).map((account): WalletPass => {
      const qrPayload = account.qrPayload || account.cardUrl || '';
      const memberCode = account.memberCode || (account.codeLast4 ? `Member # ${account.codeLast4}` : '');
      return {
        id: `reward-${account.rewardAccountId}`,
        kind: 'reward',
        title: account.storeName || account.networkName || 'Vookme Rewards',
        storeName: account.storeName || account.networkName || 'Vookme Rewards',
        subtitle: account.scopeLabel || 'Reward account',
        value: `${account.pointBalance ?? 0} pts`,
        meta: `${money(account.rewardValue ?? 0)} available`,
        badge: 'Rewards',
        codeLabel: 'Member #',
        code: memberCode,
        qrPayload,
        expiresText: 'No expiration shown',
        storePhoneDisplay: account.storePhoneDisplay || '',
        theme: 'reward-pass',
        helper: 'Show this rewards card at the store. Staff can scan the QR or enter the member number below.',
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
      badge: 'Gift Card',
      codeLabel: 'Gift card code',
      code: card.redeemCode || (card.codeLast4 ? `Ending ${card.codeLast4}` : ''),
      qrPayload: card.qrPayload || card.redeemCode || card.publicCardUrl || '',
      expiresText: formatExpiry(card.expiresAtUtc),
      storePhoneDisplay: card.storePhoneDisplay || '',
      theme: 'gift-pass',
      helper: 'Show this gift card QR or code to redeem from the balance.',
    }));

    const promoPasses = (promoSummary?.offers ?? []).map((promo): WalletPass => ({
      id: `promo-${promo.customerOfferId}`,
      kind: 'promo',
      title: promo.offerName || 'Promo Offer',
      storeName: promo.storeName || 'Vookme Store',
      subtitle: promo.storeName || 'Vookme Store',
      value: promo.benefitText || 'Special offer',
      meta: promo.channelText || 'Promo',
      badge: 'Promo',
      codeLabel: 'Promo code',
      code: promo.code || '',
      qrPayload: promo.qrPayload || (promo.code ? `promo:${promo.code}` : ''),
      expiresText: formatExpiry(promo.expiresAtUtc),
      storePhoneDisplay: promo.storePhoneDisplay || '',
      theme: 'promo-pass',
      helper: 'Show this offer at checkout. Staff can scan the QR or enter the code.',
    }));

    const all = [...rewardPasses, ...giftPasses, ...promoPasses];
    if (filter === 'rewards') return all.filter((x) => x.kind === 'reward');
    if (filter === 'giftcards') return all.filter((x) => x.kind === 'giftcard');
    if (filter === 'promos') return all.filter((x) => x.kind === 'promo');
    return all;
  }, [filter, giftCardSummary?.cards, promoSummary?.offers, rewardSummary?.accounts]);

  useEffect(() => {
    if (selectedPassId && !passes.some((pass) => pass.id === selectedPassId)) {
      setSelectedPassId('');
    }
  }, [passes, selectedPassId]);


  const displayCustomer = home?.customer ?? customer;

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
              <p>Tap a card to show the QR and full code.</p>
            </div>
          </div>

          <IonCard className="wallet-card wallet-ticket-claim-entry-card">
            <IonCardContent>
              <div className="wallet-ticket-claim-entry">
                <div>
                  <h2>Have a reward ticket?</h2>
                  <p>Scan the store's QR ticket and claim points with phone verification.</p>
                </div>
                <IonButton routerLink="/wallet/ticket-scan" fill="solid">
                  <IonIcon icon={ticketOutline} slot="start" />
                  Scan Ticket
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

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
            <IonSegmentButton value="giftcards"><IonLabel>Cards</IonLabel></IonSegmentButton>
            <IonSegmentButton value="promos"><IonLabel>Promos</IonLabel></IonSegmentButton>
          </IonSegment>

          {loading && <IonSkeletonText animated className="wallet-pass-skeleton" />}
          {!loading && passes.length === 0 && !loadError && (
            <IonCard className="wallet-card"><IonCardContent><IonText color="medium">No wallet cards found yet.</IonText></IonCardContent></IonCard>
          )}

          {!loading && passes.length > 0 && (
            <div className="wallet-pass-stack wallet-pass-stack-overlap">
              {passes.map((pass, index) => {
                const expanded = selectedPassId === pass.id;
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={expanded}
                    className={`wallet-pass ${pass.theme} ${expanded ? 'wallet-pass-expanded' : ''}`}
                    key={pass.id}
                    style={{ zIndex: expanded ? 100 : passes.length - index }}
                    onClick={() => setSelectedPassId(expanded ? '' : pass.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedPassId(expanded ? '' : pass.id);
                      }
                    }}
                  >
                    <div className="wallet-pass-top">
                      <span>{pass.badge}</span>
                      <IonBadge color="light">{expanded ? 'Open' : 'Tap'}</IonBadge>
                    </div>
                    <div className="wallet-pass-main-row">
                      <div>
                        <h2>{pass.title}</h2>
                        <p>{pass.subtitle}</p>
                      </div>
                      <div className="wallet-pass-value-block">
                        <strong>{pass.value}</strong>
                        <span>{pass.meta}</span>
                      </div>
                    </div>

                    {expanded && (
                      <div className="wallet-pass-expanded-body" onClick={(event) => event.stopPropagation()}>
                        <div className="wallet-pass-qr-area">
                          {pass.qrPayload ? (
                            <QRCodeSVG value={pass.qrPayload} size={172} level="M" includeMargin />
                          ) : (
                            <IonText color="medium">QR is not available for this card.</IonText>
                          )}
                        </div>
                        <div className="wallet-pass-detail-grid">
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
                        <p className="wallet-modal-helper">{pass.helper}</p>

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
