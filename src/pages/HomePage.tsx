import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonBadge, IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonPage, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonSkeletonText, IonText, IonTitle, IonToast, IonToolbar } from '@ionic/react';
import { giftOutline, logOutOutline, pricetagOutline, ribbonOutline, storefrontOutline } from 'ionicons/icons';
import { QRCodeSVG } from 'qrcode.react';
import { walletApi } from '../api/walletApi';
import { WalletAppActivityDto, WalletAppHomeResponse } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

type WalletFilter = 'all' | 'rewards' | 'giftcards' | 'promos';
type PassKind = 'reward' | 'giftcard' | 'promo';
interface WalletPass { id: string; kind: PassKind; title: string; subtitle: string; value: string; meta: string; badge: string; code: string; qrPayload: string; theme: string; helper: string; }
const money = (value: number): string => `$${Number(value || 0).toFixed(2)}`;
const formatDate = (value: string): string => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
const formatExpiry = (value?: string | null): string => value ? `Exp. ${new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'No expiry';

const ActivityLine: React.FC<{ activity: WalletAppActivityDto }> = ({ activity }) => (
  <IonItem lines="full" className="wallet-activity-line">
    <div slot="start" className={`wallet-activity-dot ${activity.source.toLowerCase()}`} />
    <IonLabel><h3>{activity.typeText || activity.source}</h3><p>{activity.storeName || activity.note || 'Vookme Wallet'}</p></IonLabel>
    <div slot="end" className="wallet-activity-end">
      {activity.pointDelta != null && <strong>{activity.pointDelta > 0 ? '+' : ''}{activity.pointDelta} pts</strong>}
      {activity.amount != null && <strong>{money(activity.amount)}</strong>}
      <span>{formatDate(activity.createdAtUtc)}</span>
    </div>
  </IonItem>
);

const HomePage: React.FC = () => {
  const { apiBaseUrl, authFetch, logout } = useWalletAuth();
  const [home, setHome] = useState<WalletAppHomeResponse | null>(null);
  const [filter, setFilter] = useState<WalletFilter>('all');
  const [selectedPass, setSelectedPass] = useState<WalletPass | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const loadHome = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await authFetch((token) => walletApi.home(apiBaseUrl, token));
      setHome(response.data ?? null);
    } catch (error) {
      if (showLoading) setToastMessage(error instanceof Error ? error.message : 'Wallet could not be loaded.');
    } finally { setLoading(false); }
  }, [apiBaseUrl, authFetch]);

  useEffect(() => { void loadHome(true); }, [loadHome]);
  const handleRefresh = async (event: CustomEvent) => { await loadHome(false); event.detail.complete(); };

  const passes = useMemo<WalletPass[]>(() => {
    if (!home) return [];
    const rewardPasses = home.rewardSummary.accounts.map((account): WalletPass => ({
      id: `reward-${account.rewardAccountId}`, kind: 'reward', title: account.storeName || account.networkName || 'Vookme Rewards', subtitle: account.scopeLabel || 'Reward account', value: `${account.pointBalance} pts`, meta: `${money(account.rewardValue)} available`, badge: 'Rewards', code: account.codeLast4 ? `Card ending ${account.codeLast4}` : 'Reward member card', qrPayload: account.qrPayload || account.cardUrl, theme: 'reward-pass', helper: 'Show this rewards card at the store so staff can look up your points.',
    }));
    const giftPasses = home.giftCardSummary.cards.map((card): WalletPass => ({
      id: `gift-${card.giftCardId}`, kind: 'giftcard', title: card.storeName, subtitle: card.statusText || 'Gift Card', value: money(card.balanceAmount), meta: `Gift card ending ${card.codeLast4 || '----'}`, badge: 'Gift Card', code: card.redeemCode || (card.codeLast4 ? `Ending ${card.codeLast4}` : ''), qrPayload: card.qrPayload || card.redeemCode || card.publicCardUrl, theme: 'gift-pass', helper: 'Show this gift card QR or code to redeem from the balance.',
    }));
    const promoPasses = home.promoSummary.offers.map((promo): WalletPass => ({
      id: `promo-${promo.customerOfferId}`, kind: 'promo', title: promo.offerName || 'Promo Offer', subtitle: promo.storeName, value: promo.benefitText, meta: `${formatExpiry(promo.expiresAtUtc)} · ${promo.channelText || 'Promo'}`, badge: 'Promo', code: promo.code, qrPayload: promo.qrPayload || (promo.code ? `promo:${promo.code}` : ''), theme: 'promo-pass', helper: 'Show this offer at checkout. Staff can scan the QR or enter the code.',
    }));
    const all = [...rewardPasses, ...giftPasses, ...promoPasses];
    if (filter === 'rewards') return all.filter((x) => x.kind === 'reward');
    if (filter === 'giftcards') return all.filter((x) => x.kind === 'giftcard');
    if (filter === 'promos') return all.filter((x) => x.kind === 'promo');
    return all;
  }, [filter, home]);

  return (
    <IonPage>
      <IonHeader translucent><IonToolbar><IonTitle>Wallet</IonTitle><IonButton slot="end" fill="clear" onClick={logout} aria-label="Logout"><IonIcon icon={logOutOutline} /></IonButton></IonToolbar></IonHeader>
      <IonContent fullscreen className="wallet-page-bg">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}><IonRefresherContent /></IonRefresher>
        <div className="wallet-content-wrap">
          <div className="wallet-hero-card wallet-hero-compact"><div><span className="wallet-eyebrow">Vookme Wallet</span><h1>{home?.customer.displayName || 'My Wallet'}</h1><p>{home?.customer.emailMasked || home?.customer.phoneMasked || 'Rewards, gift cards, and offers in one place.'}</p></div></div>
          <div className="wallet-summary-strip"><div><span>Rewards</span><strong>{loading ? <IonSkeletonText animated /> : `${home?.rewardSummary.totalPoints ?? 0} pts`}</strong></div><div><span>Gift Cards</span><strong>{loading ? <IonSkeletonText animated /> : money(home?.giftCardSummary.totalBalance ?? 0)}</strong></div><div><span>Promos</span><strong>{loading ? <IonSkeletonText animated /> : home?.promoSummary.activeCount ?? 0}</strong></div></div>
          <IonSegment value={filter} onIonChange={(event) => setFilter((event.detail.value as WalletFilter) || 'all')} className="wallet-filter-segment"><IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton><IonSegmentButton value="rewards"><IonLabel>Rewards</IonLabel></IonSegmentButton><IonSegmentButton value="giftcards"><IonLabel>Cards</IonLabel></IonSegmentButton><IonSegmentButton value="promos"><IonLabel>Promos</IonLabel></IonSegmentButton></IonSegment>
          {loading && <IonSkeletonText animated className="wallet-pass-skeleton" />}
          {!loading && passes.length === 0 && <IonCard className="wallet-card"><IonCardContent><IonText color="medium">No wallet passes found yet.</IonText></IonCardContent></IonCard>}
          {!loading && passes.length > 0 && <div className="wallet-pass-stack">{passes.map((pass) => <button type="button" className={`wallet-pass ${pass.theme}`} key={pass.id} onClick={() => setSelectedPass(pass)}><div className="wallet-pass-top"><span>{pass.badge}</span><IonBadge color="light">Tap</IonBadge></div><div><h2>{pass.title}</h2><p>{pass.subtitle}</p></div><div className="wallet-pass-bottom"><strong>{pass.value}</strong><span>{pass.meta}</span></div></button>)}</div>}
          <IonCard className="wallet-card"><IonCardContent><div className="wallet-section-title-row"><div><h2>Recent activity</h2><p>Latest wallet movement</p></div><IonButton fill="clear" routerLink="/wallet/activity">View all</IonButton></div>{loading && <IonSkeletonText animated className="wallet-list-skeleton" />}{!loading && home?.recentActivities.length === 0 && <IonText color="medium">No recent activity yet.</IonText>}{!loading && Boolean(home?.recentActivities.length) && <IonList className="wallet-clean-list">{home?.recentActivities.slice(0, 5).map((activity, index) => <ActivityLine activity={activity} key={`${activity.source}-${activity.createdAtUtc}-${index}`} />)}</IonList>}</IonCardContent></IonCard>
          <IonCard className="wallet-card"><IonCardContent><div className="wallet-section-title-row"><div><h2>Connected stores</h2><p>Places connected to your wallet</p></div><IonButton fill="clear" routerLink="/wallet/stores">View all</IonButton></div>{!loading && home?.favoriteStores.length === 0 && <IonText color="medium">No connected stores found.</IonText>}{!loading && Boolean(home?.favoriteStores.length) && <IonList className="wallet-clean-list">{home?.favoriteStores.map((store) => <IonItem lines="full" key={store.storeId}><IonIcon icon={storefrontOutline} slot="start" /><IonLabel><h3>{store.storeName}</h3><p>{store.cityState || store.businessTypeName}</p></IonLabel><div className="wallet-store-mini-badges" slot="end">{store.rewardsEnabled && <IonIcon icon={ribbonOutline} />}{store.giftCardsEnabled && <IonIcon icon={giftOutline} />}{store.promosEnabled && <IonIcon icon={pricetagOutline} />}</div></IonItem>)}</IonList>}</IonCardContent></IonCard>
        </div>
        <IonModal isOpen={Boolean(selectedPass)} onDidDismiss={() => setSelectedPass(null)} breakpoints={[0, 0.92]} initialBreakpoint={0.92}><IonContent className="wallet-page-bg">{selectedPass && <div className="wallet-modal-wrap"><div className={`wallet-pass wallet-pass-modal ${selectedPass.theme}`}><div className="wallet-pass-top"><span>{selectedPass.badge}</span><IonBadge color="light">Ready</IonBadge></div><div><h2>{selectedPass.title}</h2><p>{selectedPass.subtitle}</p></div><div className="wallet-pass-bottom"><strong>{selectedPass.value}</strong><span>{selectedPass.meta}</span></div></div><IonCard className="wallet-card wallet-qr-detail-card"><IonCardContent>{selectedPass.qrPayload ? <div className="wallet-qr-box wallet-qr-box-bright"><QRCodeSVG value={selectedPass.qrPayload} size={260} level="M" includeMargin /></div> : <IonText color="medium">QR is not available for this pass.</IonText>}{selectedPass.code && <div className="wallet-code-block"><span>Code</span><strong>{selectedPass.code}</strong></div>}<p className="wallet-modal-helper">{selectedPass.helper}</p><IonButton expand="block" onClick={() => setSelectedPass(null)}>Done</IonButton></IonCardContent></IonCard></div>}</IonContent></IonModal>
        <IonToast isOpen={Boolean(toastMessage)} message={toastMessage} duration={2600} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};
export default HomePage;
