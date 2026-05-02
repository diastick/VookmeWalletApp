import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonBadge,
  IonButton,
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
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { walletApi } from '../api/walletApi';
import { WalletAppActivityDto } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

type ActivityFilter = 'all' | 'reward' | 'giftcard' | 'promo';

const money = (value: number): string => `$${Number(value || 0).toFixed(2)}`;
const safeLower = (value?: string | null): string => (value ?? '').toLowerCase();
const sourceKey = (source?: string | null): ActivityFilter => {
  const value = safeLower(source);
  if (value.includes('gift')) return 'giftcard';
  if (value.includes('promo') || value.includes('offer')) return 'promo';
  return 'reward';
};
const formatDateTime = (value?: string | null): string => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const groupLabel = (value?: string | null): string => {
  if (!value) return 'Other';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Other';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const ActivityPage: React.FC = () => {
  const { apiBaseUrl, authFetch } = useWalletAuth();
  const [rows, setRows] = useState<WalletAppActivityDto[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const loadActivity = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError('');

    try {
      const response = await authFetch((token) => walletApi.activity(apiBaseUrl, token));
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      // Do not leave the Activity tab broken if the dedicated activity endpoint
      // is unavailable during an app/backend version mismatch. The home endpoint
      // already returns recent activity, so use it as a safe fallback.
      try {
        const fallback = await authFetch((token) => walletApi.home(apiBaseUrl, token));
        const fallbackRows = fallback.data?.recentActivities ?? [];
        setRows(Array.isArray(fallbackRows) ? fallbackRows : []);
        setLoadError('');
        if (fallbackRows.length === 0) setToastMessage('No recent activity found yet.');
      } catch (fallbackError) {
        const message = fallbackError instanceof Error
          ? fallbackError.message
          : error instanceof Error
            ? error.message
            : 'Activity could not be loaded.';
        setLoadError(message);
        setToastMessage(message);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authFetch]);

  useEffect(() => { void loadActivity(true); }, [loadActivity]);

  const handleRefresh = async (event: CustomEvent) => {
    await loadActivity(false);
    event.detail.complete();
  };

  const filteredRows = useMemo(() => filter === 'all' ? rows : rows.filter((row) => sourceKey(row.source) === filter), [filter, rows]);

  const groups = useMemo(() => {
    const map = new Map<string, WalletAppActivityDto[]>();
    filteredRows.forEach((row) => {
      const label = groupLabel(row.createdAtUtc);
      map.set(label, [...(map.get(label) ?? []), row]);
    });
    return Array.from(map.entries());
  }, [filteredRows]);

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const thisMonth = rows.filter((row) => {
      if (!row.createdAtUtc) return false;
      const date = new Date(row.createdAtUtc);
      return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });

    return {
      earned: thisMonth.filter((x) => sourceKey(x.source) === 'reward' && (x.pointDelta ?? 0) > 0).reduce((sum, x) => sum + (x.pointDelta ?? 0), 0),
      redeemed: Math.abs(thisMonth.filter((x) => sourceKey(x.source) === 'reward' && (x.pointDelta ?? 0) < 0).reduce((sum, x) => sum + (x.pointDelta ?? 0), 0)),
      giftUsed: thisMonth.filter((x) => sourceKey(x.source) === 'giftcard' && (safeLower(x.typeText).includes('redeem') || safeLower(x.typeText).includes('used'))).reduce((sum, x) => sum + Math.abs(x.amount ?? 0), 0),
      promosUsed: thisMonth.filter((x) => sourceKey(x.source) === 'promo' && (safeLower(x.typeText).includes('redeem') || safeLower(x.typeText).includes('used'))).length,
    };
  }, [rows]);

  return (
    <IonPage>
      <IonHeader translucent><IonToolbar><IonTitle>Activity</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen className="wallet-page-bg">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}><IonRefresherContent /></IonRefresher>
        <div className="wallet-content-wrap">
          <IonCard className="wallet-card wallet-activity-summary-card">
            <IonCardContent>
              <span>This month</span>
              <div className="wallet-activity-summary-grid">
                <div><strong>+{monthlySummary.earned}</strong><small>pts earned</small></div>
                <div><strong>-{monthlySummary.redeemed}</strong><small>pts used</small></div>
                <div><strong>{money(monthlySummary.giftUsed)}</strong><small>cards used</small></div>
                <div><strong>{monthlySummary.promosUsed}</strong><small>promos used</small></div>
              </div>
            </IonCardContent>
          </IonCard>

          {loadError && !loading && (
            <IonCard className="wallet-card wallet-error-card">
              <IonCardContent>
                <IonText color="danger"><h2>Activity could not be loaded</h2></IonText>
                <p>{loadError}</p>
                <IonButton expand="block" onClick={() => loadActivity(true)}>Try again</IonButton>
              </IonCardContent>
            </IonCard>
          )}

          <IonSegment value={filter} onIonChange={(event) => setFilter((event.detail.value as ActivityFilter) || 'all')} className="wallet-filter-segment">
            <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="reward"><IonLabel>Rewards</IonLabel></IonSegmentButton>
            <IonSegmentButton value="giftcard"><IonLabel>Cards</IonLabel></IonSegmentButton>
            <IonSegmentButton value="promo"><IonLabel>Promos</IonLabel></IonSegmentButton>
          </IonSegment>

          {loading && <IonSkeletonText animated className="wallet-list-skeleton" />}
          {!loading && filteredRows.length === 0 && !loadError && <IonCard className="wallet-card"><IonCardContent><IonText color="medium">No activity found.</IonText></IonCardContent></IonCard>}
          {!loading && groups.map(([label, groupRows]) => (
            <div className="wallet-activity-group" key={label}>
              <h2>{label}</h2>
              <IonList className="wallet-clean-list wallet-activity-list">
                {groupRows.map((row, index) => {
                  const key = sourceKey(row.source);
                  return (
                    <IonItem lines="full" key={`${row.source}-${row.createdAtUtc}-${index}`}>
                      <div slot="start" className={`wallet-activity-icon ${key}`}>{key === 'reward' ? 'R' : key === 'giftcard' ? '$' : '%'}</div>
                      <IonLabel>
                        <h3>{row.typeText || row.source || 'Wallet Activity'}</h3>
                        <p>{row.storeName || row.note || 'Vookme Wallet'}</p>
                        {row.note && <p className="wallet-activity-note">{row.note}</p>}
                      </IonLabel>
                      <div slot="end" className="wallet-activity-end">
                        {row.pointDelta != null && <strong className={row.pointDelta < 0 ? 'wallet-negative' : 'wallet-positive'}>{row.pointDelta > 0 ? '+' : ''}{row.pointDelta} pts</strong>}
                        {row.amount != null && <strong>{money(Math.abs(row.amount))}</strong>}
                        <IonBadge color={key === 'reward' ? 'success' : key === 'giftcard' ? 'tertiary' : 'warning'}>{row.source || 'Wallet'}</IonBadge>
                        <span>{formatDateTime(row.createdAtUtc)}</span>
                      </div>
                    </IonItem>
                  );
                })}
              </IonList>
            </div>
          ))}
        </div>
        <IonToast isOpen={Boolean(toastMessage)} message={toastMessage} duration={2600} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default ActivityPage;
