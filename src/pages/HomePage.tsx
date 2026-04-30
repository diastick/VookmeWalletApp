import React, { useCallback, useEffect, useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { giftOutline, logOutOutline, qrCodeOutline, storefrontOutline, walletOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { walletApi } from '../api/walletApi';
import { WalletAppActivityDto, WalletAppHomeResponse } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

const money = (value: number): string => `$${Number(value || 0).toFixed(2)}`;

const formatDate = (value: string): string => {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const ActivityLine: React.FC<{ activity: WalletAppActivityDto }> = ({ activity }) => (
  <IonItem lines="full">
    <IonLabel>
      <h3>{activity.typeText || activity.source}</h3>
      <p>{activity.storeName || activity.note || 'Vookme Wallet'}</p>
    </IonLabel>
    <div slot="end" className="wallet-activity-end">
      {activity.pointDelta != null && <strong>{activity.pointDelta > 0 ? '+' : ''}{activity.pointDelta} pts</strong>}
      {activity.amount != null && <strong>{money(activity.amount)}</strong>}
      <span>{formatDate(activity.createdAtUtc)}</span>
    </div>
  </IonItem>
);

const HomePage: React.FC = () => {
  const history = useHistory();
  const { apiBaseUrl, authFetch, logout } = useWalletAuth();
  const [home, setHome] = useState<WalletAppHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const loadHome = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch((token) => walletApi.home(apiBaseUrl, token));
      setHome(response.data ?? null);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Wallet home could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authFetch]);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const handleRefresh = async (event: CustomEvent) => {
    await loadHome();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Wallet</IonTitle>
          <IonButton slot="end" fill="clear" onClick={logout} aria-label="Logout">
            <IonIcon icon={logOutOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="wallet-page-bg">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="wallet-content-wrap">
          <div className="wallet-hero-card">
            <div>
              <span className="wallet-eyebrow">Vookme Customer Wallet</span>
              <h1>{home?.customer.displayName || 'Welcome back'}</h1>
              <p>{home?.customer.emailMasked || home?.customer.phoneMasked || 'Your rewards and gift cards are ready.'}</p>
            </div>
            <IonButton fill="solid" color="light" routerLink="/wallet/qr" disabled={!home?.qrAvailable}>
              <IonIcon slot="start" icon={qrCodeOutline} />
              My QR
            </IonButton>
          </div>

          <IonGrid className="wallet-stats-grid">
            <IonRow>
              <IonCol size="6">
                <IonCard className="wallet-stat-card">
                  <IonCardContent>
                    <IonIcon icon={walletOutline} />
                    <span>Rewards</span>
                    <strong>{loading ? <IonSkeletonText animated /> : home?.rewardSummary.totalPoints ?? 0}</strong>
                    <p>{money(home?.rewardSummary.totalRewardValue ?? 0)}</p>
                  </IonCardContent>
                </IonCard>
              </IonCol>
              <IonCol size="6">
                <IonCard className="wallet-stat-card">
                  <IonCardContent>
                    <IonIcon icon={giftOutline} />
                    <span>Gift Cards</span>
                    <strong>{loading ? <IonSkeletonText animated /> : home?.giftCardSummary.activeCount ?? 0}</strong>
                    <p>{money(home?.giftCardSummary.totalBalance ?? 0)}</p>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>

          <IonCard className="wallet-card">
            <IonCardContent>
              <div className="wallet-section-title-row">
                <div>
                  <h2>Recent activity</h2>
                  <p>Latest reward and gift card movement</p>
                </div>
              </div>

              {loading && <IonSkeletonText animated className="wallet-list-skeleton" />}

              {!loading && home?.recentActivities.length === 0 && (
                <IonText color="medium">No recent activity yet.</IonText>
              )}

              {!loading && Boolean(home?.recentActivities.length) && (
                <IonList className="wallet-clean-list">
                  {home?.recentActivities.map((activity, index) => (
                    <ActivityLine activity={activity} key={`${activity.source}-${activity.createdAtUtc}-${index}`} />
                  ))}
                </IonList>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard className="wallet-card">
            <IonCardContent>
              <div className="wallet-section-title-row">
                <div>
                  <h2>Connected stores</h2>
                  <p>Stores connected to your wallet</p>
                </div>
                <IonButton fill="clear" routerLink="/wallet/stores">
                  View all
                </IonButton>
              </div>

              {!loading && home?.favoriteStores.length === 0 && (
                <IonText color="medium">No connected stores found.</IonText>
              )}

              {!loading && Boolean(home?.favoriteStores.length) && (
                <IonList className="wallet-clean-list">
                  {home?.favoriteStores.map((store) => (
                    <IonItem lines="full" key={store.storeId}>
                      <IonIcon icon={storefrontOutline} slot="start" />
                      <IonLabel>
                        <h3>{store.storeName}</h3>
                        <p>{store.cityState || store.businessTypeName}</p>
                      </IonLabel>
                      {store.rewardsEnabled && <IonBadge color="success">Rewards</IonBadge>}
                    </IonItem>
                  ))}
                </IonList>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={Boolean(toastMessage)}
          message={toastMessage}
          duration={2600}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
