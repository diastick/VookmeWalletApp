import React, { useCallback, useEffect, useState } from 'react';
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { walletApi } from '../api/walletApi';
import { WalletAppGiftCardSummaryDto } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

const money = (value: number): string => `$${Number(value || 0).toFixed(2)}`;

const GiftCardsPage: React.FC = () => {
  const { apiBaseUrl, authFetch } = useWalletAuth();
  const [summary, setSummary] = useState<WalletAppGiftCardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const loadGiftCards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch((token) => walletApi.giftCards(apiBaseUrl, token));
      setSummary(response.data ?? null);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Gift cards could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authFetch]);

  useEffect(() => {
    void loadGiftCards();
  }, [loadGiftCards]);

  const handleRefresh = async (event: CustomEvent) => {
    await loadGiftCards();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Gift Cards</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="wallet-page-bg">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="wallet-content-wrap">
          <div className="wallet-balance-card gifts">
            <span>Gift card balance</span>
            <strong>{loading ? <IonSkeletonText animated /> : money(summary?.totalBalance ?? 0)}</strong>
            <p>{summary?.activeCount ?? 0} active cards</p>
          </div>

          <IonCard className="wallet-card">
            <IonCardContent>
              <div className="wallet-section-title-row">
                <div>
                  <h2>Saved gift cards</h2>
                  <p>Cards saved to your Vookme Wallet</p>
                </div>
              </div>

              {loading && <IonSkeletonText animated className="wallet-list-skeleton" />}

              {!loading && summary?.cards.length === 0 && (
                <IonText color="medium">No saved gift cards yet.</IonText>
              )}

              {!loading && Boolean(summary?.cards.length) && (
                <IonList className="wallet-clean-list">
                  {summary?.cards.map((card) => (
                    <IonItem lines="full" key={card.giftCardId}>
                      <IonLabel>
                        <h3>{card.storeName}</h3>
                        <p>Ending {card.codeLast4 || '----'}</p>
                      </IonLabel>
                      <div slot="end" className="wallet-end-stack">
                        <strong>{money(card.balanceAmount)}</strong>
                        <IonBadge color={card.statusText === 'Active' ? 'success' : 'medium'}>{card.statusText}</IonBadge>
                      </div>
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

export default GiftCardsPage;
