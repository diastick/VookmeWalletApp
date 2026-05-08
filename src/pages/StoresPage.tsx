import React, { useCallback, useEffect, useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { callOutline, locationOutline, refreshOutline, restaurantOutline, ribbonOutline } from 'ionicons/icons';
import { walletApi } from '../api/walletApi';
import { WalletAppPagedResponse, WalletAppStoreDto } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

const PAGE_SIZE = 20;

const openExternal = (url?: string) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const StoresPage: React.FC = () => {
  const { apiBaseUrl, authFetch } = useWalletAuth();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [stores, setStores] = useState<WalletAppStoreDto[]>([]);
  const [pageInfo, setPageInfo] = useState<WalletAppPagedResponse<WalletAppStoreDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const loadStores = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);

    try {
      const response = await authFetch((token) => walletApi.stores(apiBaseUrl, token, query, location, page, PAGE_SIZE));
      const data = response.data;
      setPageInfo(data ?? null);
      setStores((current) => append ? [...current, ...(data?.rows ?? [])] : data?.rows ?? []);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Stores could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authFetch, location, query]);

  useEffect(() => { void loadStores(1, false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const hasMore = pageInfo ? pageInfo.page < pageInfo.totalPages : false;
  const handleLoadMore = async (event: CustomEvent<void>) => {
    if (pageInfo && pageInfo.page < pageInfo.totalPages) await loadStores(pageInfo.page + 1, true);
    (event.target as HTMLIonInfiniteScrollElement).complete();
  };
  const handleSearch = async () => { await loadStores(1, false); };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Network</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => loadStores(1, false)} aria-label="Refresh participating stores"><IonIcon icon={refreshOutline} /></IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="wallet-page-bg">
        <div className="wallet-content-wrap">
          <IonCard className="wallet-card wallet-network-intro-card">
            <IonCardContent>
              <span className="wallet-eyebrow wallet-eyebrow-dark">Local Rewards Network</span>
              <h2>Find places to earn and redeem</h2>
              <p>Search participating local stores. Your Vookme Rewards can be used where redeem is enabled, and redemption has no extra customer fee.</p>
            </IonCardContent>
          </IonCard>

          <IonCard className="wallet-card wallet-search-card">
            <IonCardContent>
              <IonSearchbar value={query} debounce={0} placeholder="Search store, food, beauty, cafe..." onIonInput={(event) => setQuery(String(event.detail.value ?? ''))} onKeyDown={(event) => { if (event.key === 'Enter') void handleSearch(); }} />
              <IonSearchbar value={location} debounce={0} placeholder="City, state, ZIP, or network area" onIonInput={(event) => setLocation(String(event.detail.value ?? ''))} onKeyDown={(event) => { if (event.key === 'Enter') void handleSearch(); }} />
              <IonButton expand="block" onClick={handleSearch}>Search</IonButton>
            </IonCardContent>
          </IonCard>

          {loading && <IonSkeletonText animated className="wallet-list-skeleton" />}
          {!loading && stores.length === 0 && <IonCard className="wallet-card"><IonCardContent><IonText color="medium">No participating stores found.</IonText></IonCardContent></IonCard>}

          {!loading && stores.length > 0 && (
            <IonList className="wallet-store-list">
              {stores.map((store) => (
                <IonItem lines="none" className="wallet-store-item" key={`${store.networkId || 0}-${store.storeId}`}>
                  <div className="wallet-store-avatar wallet-store-avatar-rewards" slot="start"><IonIcon icon={store.businessTypeName?.toLowerCase().includes('restaurant') ? restaurantOutline : ribbonOutline} /></div>
                  <IonLabel>
                    <div className="wallet-store-title-row">
                      <h3>{store.storeName}</h3>
                      {store.isFeatured && <IonBadge color="warning">Featured</IonBadge>}
                    </div>
                    <p><IonIcon icon={locationOutline} /> {store.cityState || store.businessTypeName || 'Participating store'}</p>
                    <p className="wallet-network-name">{store.networkDisplayName || store.networkName || 'Vookme Local Rewards'}</p>
                    <div className="wallet-store-badges">
                      {store.earnHere && <IonBadge color="success">Earn here</IonBadge>}
                      {store.redeemHere && <IonBadge color="tertiary">Redeem here</IonBadge>}
                      {store.giftCardsEnabled && <IonBadge color="medium">Gift Cards</IonBadge>}
                      {store.promosEnabled && <IonBadge color="medium">Promos</IonBadge>}
                    </div>
                    {store.currentOffer && <small className="wallet-store-help-text">{store.currentOffer}</small>}
                    <div className="wallet-store-action-row">
                      {store.orderUrl && <IonButton size="small" fill="outline" onClick={() => openExternal(`${apiBaseUrl.replace(/\/+$/, '')}${store.orderUrl}`)}>Order</IonButton>}
                      {store.reservationUrl && <IonButton size="small" fill="outline" onClick={() => openExternal(`${apiBaseUrl.replace(/\/+$/, '')}${store.reservationUrl}`)}>Reserve</IonButton>}
                      {store.phoneDisplay && <IonButton size="small" fill="clear" href={`tel:${store.phoneDisplay.replace(/[^0-9+]/g, '')}`}><IonIcon icon={callOutline} slot="start" />Call</IonButton>}
                    </div>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          )}
        </div>
        <IonInfiniteScroll disabled={!hasMore} onIonInfinite={handleLoadMore}>
          <IonInfiniteScrollContent loadingText="Loading more stores..." />
        </IonInfiniteScroll>
        <IonToast isOpen={Boolean(toastMessage)} message={toastMessage} duration={2600} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default StoresPage;
