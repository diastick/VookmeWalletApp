import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { WalletAppRewardSummaryDto } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

const money = (value: number): string => `$${Number(value || 0).toFixed(2)}`;

const RewardsPage: React.FC = () => {
  const { apiBaseUrl, authFetch } = useWalletAuth();
  const [summary, setSummary] = useState<WalletAppRewardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const loadRewards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch((token) => walletApi.rewards(apiBaseUrl, token));
      setSummary(response.data ?? null);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Rewards could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authFetch]);

  useEffect(() => {
    void loadRewards();
  }, [loadRewards]);

  const handleRefresh = async (event: CustomEvent) => {
    await loadRewards();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Rewards</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="wallet-page-bg">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="wallet-content-wrap">
          <div className="wallet-balance-card rewards">
            <span>Total rewards</span>
            <strong>{loading ? <IonSkeletonText animated /> : `${summary?.totalPoints ?? 0} pts`}</strong>
            <p>{money(summary?.totalRewardValue ?? 0)} available value</p>
          </div>

          <IonCard className="wallet-card">
            <IonCardContent>
              <div className="wallet-section-title-row">
                <div>
                  <h2>Reward accounts</h2>
                  <p>Store and network reward balances</p>
                </div>
              </div>

              {loading && <IonSkeletonText animated className="wallet-list-skeleton" />}

              {!loading && summary?.accounts.length === 0 && (
                <IonText color="medium">No reward accounts yet.</IonText>
              )}

              {!loading && Boolean(summary?.accounts.length) && (
                <IonList className="wallet-clean-list">
                  {summary?.accounts.map((account) => (
                    <IonItem lines="full" key={account.rewardAccountId}>
                      <IonLabel>
                        <h3>{account.storeName || account.networkName || 'Vookme Rewards'}</h3>
                        <p>{account.scopeLabel || account.networkName || 'Reward balance'}</p>
                      </IonLabel>
                      <div slot="end" className="wallet-end-stack">
                        <strong>{account.pointBalance} pts</strong>
                        <span>{money(account.rewardValue)}</span>
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

export default RewardsPage;
