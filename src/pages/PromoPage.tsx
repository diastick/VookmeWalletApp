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
import { callOutline, closeOutline, globeOutline, locationOutline, pricetagOutline, qrCodeOutline } from 'ionicons/icons';
import { QRCodeSVG } from 'qrcode.react';
import { walletApi } from '../api/walletApi';
import { WalletAppAvailableOfferDto, WalletAppPromoOfferDto, WalletAppPromoSummaryDto } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

type PromoTabKey = 'my' | 'offers';
type PromoDetailState =
  | { kind: 'my'; id: number }
  | { kind: 'offer'; id: number }
  | null;

const formatDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatExpiry = (value?: string | null): string => value ? `Expires ${formatDate(value)}` : 'No expiration shown';

const formatValidRange = (start?: string | null, end?: string | null): string => {
  const startText = formatDate(start);
  const endText = formatDate(end);
  if (startText && endText) return `${startText} - ${endText}`;
  if (endText) return `Valid until ${endText}`;
  if (startText) return `Starts ${startText}`;
  return 'No date shown';
};

const channelText = (offer: Pick<WalletAppPromoOfferDto | WalletAppAvailableOfferDto, 'isInStoreRedeemable' | 'isOnlineOrderRedeemable' | 'isReservationRedeemable' | 'channelText'>): string => {
  const parts: string[] = [];
  if (offer.isInStoreRedeemable) parts.push('In store');
  if (offer.isOnlineOrderRedeemable) parts.push('Online order');
  if (offer.isReservationRedeemable) parts.push('Reservation');
  return parts.length > 0 ? parts.join(' / ') : offer.channelText || 'Promo';
};

const openExternal = (url?: string | null, baseUrl?: string): void => {
  let value = (url || '').trim();
  if (!value) return;
  if (/^tel:/i.test(value)) {
    window.open(value, '_blank', 'noopener,noreferrer');
    return;
  }
  if (!/^https?:\/\//i.test(value) && baseUrl) {
    value = `${baseUrl.replace(/\/+$/, '')}${value.startsWith('/') ? value : `/${value}`}`;
  }
  window.open(value, '_blank', 'noopener,noreferrer');
};

const PromoPage: React.FC = () => {
  const { apiBaseUrl, authFetch } = useWalletAuth();
  const [summary, setSummary] = useState<WalletAppPromoSummaryDto | null>(null);
  const [activeTab, setActiveTab] = useState<PromoTabKey>('my');
  const [detail, setDetail] = useState<PromoDetailState>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const loadPromos = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError('');

    try {
      const response = await authFetch((token) => walletApi.promos(apiBaseUrl, token));
      const data = response.data ?? null;
      setSummary(data);

      if (data && activeTab === 'my' && (data.offers ?? []).length === 0 && (data.availableOffers ?? []).length > 0) {
        setActiveTab('offers');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Promos could not be loaded.';
      setLoadError(message);
      setToastMessage(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, apiBaseUrl, authFetch]);

  useEffect(() => { void loadPromos(true); }, [loadPromos]);

  const handleRefresh = async (event: CustomEvent) => {
    await loadPromos(false);
    event.detail.complete();
  };

  const myPromos = useMemo(() => summary?.offers ?? [], [summary?.offers]);
  const availableOffers = useMemo(() => summary?.availableOffers ?? [], [summary?.availableOffers]);

  const selectedMyPromo = useMemo(() => {
    if (detail?.kind !== 'my') return null;
    return myPromos.find((offer) => offer.customerOfferId === detail.id) ?? null;
  }, [detail, myPromos]);

  const selectedAvailableOffer = useMemo(() => {
    if (detail?.kind !== 'offer') return null;
    return availableOffers.find((offer) => offer.offerId === detail.id) ?? null;
  }, [availableOffers, detail]);

  const hasDetail = Boolean(selectedMyPromo || selectedAvailableOffer);

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Promo</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="wallet-page-bg wallet-promo-page">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}><IonRefresherContent /></IonRefresher>
        <div className="wallet-content-wrap wallet-promo-wrap">
          {!hasDetail && (
            <>
              <div className="wallet-promo-header">
                <span className="wallet-eyebrow wallet-eyebrow-dark">Local deals</span>
                <h1>Promo</h1>
                <p>Your promos and offers from local stores.</p>
              </div>

              <IonSegment
                value={activeTab}
                className="wallet-promo-segment"
                onIonChange={(event) => setActiveTab((event.detail.value as PromoTabKey) || 'my')}
              >
                <IonSegmentButton value="my"><IonLabel>My Promos</IonLabel></IonSegmentButton>
                <IonSegmentButton value="offers"><IonLabel>Available Offers</IonLabel></IonSegmentButton>
              </IonSegment>

              {loadError && !loading && (
                <IonCard className="wallet-card wallet-error-card">
                  <IonCardContent>
                    <IonText color="danger"><h2>Promos could not be loaded</h2></IonText>
                    <p>{loadError}</p>
                    <IonButton expand="block" onClick={() => loadPromos(true)}>Try again</IonButton>
                  </IonCardContent>
                </IonCard>
              )}

              {loading && <IonSkeletonText animated className="wallet-list-skeleton" />}

              {!loading && activeTab === 'my' && myPromos.length === 0 && !loadError && (
                <IonCard className="wallet-card">
                  <IonCardContent>
                    <IonText color="medium">No saved promos yet.</IonText>
                    {availableOffers.length > 0 && (
                      <IonButton expand="block" className="wallet-promo-empty-button" onClick={() => setActiveTab('offers')}>Browse Available Offers</IonButton>
                    )}
                  </IonCardContent>
                </IonCard>
              )}

              {!loading && activeTab === 'offers' && availableOffers.length === 0 && !loadError && (
                <IonCard className="wallet-card">
                  <IonCardContent>
                    <IonText color="medium">No available offers found yet.</IonText>
                  </IonCardContent>
                </IonCard>
              )}

              {!loading && activeTab === 'my' && myPromos.length > 0 && (
                <div className="wallet-promo-list">
                  {myPromos.map((offer) => (
                    <button
                      type="button"
                      className="wallet-promo-list-card"
                      key={offer.customerOfferId}
                      onClick={() => setDetail({ kind: 'my', id: offer.customerOfferId })}
                    >
                      <div className="wallet-promo-list-icon"><IonIcon icon={qrCodeOutline} /></div>
                      <div className="wallet-promo-list-main">
                        <span>{offer.storeName || 'Vookme Store'}</span>
                        <strong>{offer.offerName || 'Promo Offer'}</strong>
                        <p>{offer.benefitText || channelText(offer)}</p>
                      </div>
                      <div className="wallet-promo-list-end">
                        <span>{formatExpiry(offer.expiresAtUtc)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && activeTab === 'offers' && availableOffers.length > 0 && (
                <div className="wallet-promo-list">
                  {availableOffers.map((offer) => (
                    <button
                      type="button"
                      className={`wallet-promo-list-card wallet-offer-list-card${offer.alreadyRedeemed ? ' wallet-offer-used' : ''}`}
                      key={offer.offerId}
                      onClick={() => setDetail({ kind: 'offer', id: offer.offerId })}
                    >
                      <div className="wallet-promo-list-icon"><IonIcon icon={pricetagOutline} /></div>
                      <div className="wallet-promo-list-main">
                        <span>{offer.storeName || 'Vookme Store'}</span>
                        <strong>{offer.offerName || 'Available Offer'}</strong>
                        <p>{offer.summary || offer.benefitText || channelText(offer)}</p>
                        {(offer.requiresCustomerTracking || offer.firstVisitOnly || offer.requiresClaim) && (
                          <small className="wallet-offer-track-note">Use wallet QR or phone at store</small>
                        )}
                      </div>
                      <div className="wallet-promo-list-end">
                        {offer.alreadyInWallet && <span>In My Promos</span>}
                        {!offer.alreadyInWallet && offer.alreadyRedeemed && <span>Already used</span>}
                        {!offer.alreadyInWallet && !offer.alreadyRedeemed && <span>{formatValidRange(offer.startDateUtc, offer.endDateUtc)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {selectedMyPromo && (
            <IonCard className="wallet-promo-detail-card">
              <IonButton
                fill="clear"
                size="small"
                className="wallet-promo-detail-close"
                aria-label="Close promo detail"
                onClick={() => setDetail(null)}
              >
                <IonIcon icon={closeOutline} />
              </IonButton>
              <IonCardContent>
                <span className="wallet-eyebrow">My Promo</span>
                <h1>{selectedMyPromo.offerName || 'Promo Offer'}</h1>
                <p className="wallet-promo-store-name">{selectedMyPromo.storeName || 'Vookme Store'}</p>
                <div className="wallet-promo-benefit-box">{selectedMyPromo.benefitText || 'Special offer'}</div>

                <div className="wallet-promo-qr-box">
                  {selectedMyPromo.qrPayload || selectedMyPromo.code ? (
                    <QRCodeSVG value={selectedMyPromo.qrPayload || `promo:${selectedMyPromo.code}`} size={150} level="M" includeMargin />
                  ) : (
                    <IonText color="medium">QR is not available for this promo.</IonText>
                  )}
                </div>

                <div className="wallet-pass-detail-grid wallet-pass-detail-grid-compact">
                  <div><span>Promo code</span><strong>{selectedMyPromo.code || 'Not available'}</strong></div>
                  <div><span>Use at</span><strong>{channelText(selectedMyPromo)}</strong></div>
                  <div><span>Expiration</span><strong>{formatExpiry(selectedMyPromo.expiresAtUtc)}</strong></div>
                </div>

                <p className="wallet-promo-detail-note">Show this QR or promo code when you use the offer.</p>
              </IonCardContent>
            </IonCard>
          )}

          {selectedAvailableOffer && (
            <IonCard className="wallet-promo-detail-card wallet-offer-detail-card">
              <IonButton
                fill="clear"
                size="small"
                className="wallet-promo-detail-close"
                aria-label="Close offer detail"
                onClick={() => setDetail(null)}
              >
                <IonIcon icon={closeOutline} />
              </IonButton>
              <IonCardContent>
                <span className="wallet-eyebrow">Available Offer</span>
                <h1>{selectedAvailableOffer.offerName || 'Available Offer'}</h1>
                <p className="wallet-promo-store-name">{selectedAvailableOffer.storeName || 'Vookme Store'}</p>
                <div className="wallet-promo-benefit-box">{selectedAvailableOffer.benefitText || selectedAvailableOffer.summary || 'Special offer'}</div>

                {(selectedAvailableOffer.summary || selectedAvailableOffer.description) && (
                  <p className="wallet-offer-description">{selectedAvailableOffer.description || selectedAvailableOffer.summary}</p>
                )}

                <div className="wallet-offer-action-box">
                  <strong>{selectedAvailableOffer.actionText || 'Show this offer at the store.'}</strong>
                  {(selectedAvailableOffer.requiresCustomerTracking || selectedAvailableOffer.firstVisitOnly || selectedAvailableOffer.requiresClaim) && (
                    <span>Staff can verify you by scanning your wallet QR or by looking up your phone number.</span>
                  )}
                </div>

                <div className="wallet-pass-detail-grid wallet-pass-detail-grid-compact">
                  <div><span>Valid</span><strong>{formatValidRange(selectedAvailableOffer.startDateUtc, selectedAvailableOffer.endDateUtc)}</strong></div>
                  <div><span>Use at</span><strong>{channelText(selectedAvailableOffer)}</strong></div>
                  <div><span>Status</span><strong>{selectedAvailableOffer.alreadyRedeemed ? 'Already used' : selectedAvailableOffer.alreadyInWallet ? 'In My Promos' : 'Available'}</strong></div>
                </div>

                {selectedAvailableOffer.terms && <p className="wallet-promo-detail-note">{selectedAvailableOffer.terms}</p>}

                <div className="wallet-offer-actions">
                  {selectedAvailableOffer.storePhoneDisplay && (
                    <IonButton fill="outline" onClick={() => openExternal(`tel:${selectedAvailableOffer.storePhoneDisplay}`)}>
                      <IonIcon slot="start" icon={callOutline} />Call
                    </IonButton>
                  )}
                  {selectedAvailableOffer.websiteUrl && (
                    <IonButton fill="outline" onClick={() => openExternal(selectedAvailableOffer.websiteUrl, apiBaseUrl)}>
                      <IonIcon slot="start" icon={globeOutline} />Website
                    </IonButton>
                  )}
                  {selectedAvailableOffer.homeUrl && (
                    <IonButton fill="outline" onClick={() => openExternal(selectedAvailableOffer.homeUrl, apiBaseUrl)}>
                      <IonIcon slot="start" icon={locationOutline} />Store
                    </IonButton>
                  )}
                </div>
              </IonCardContent>
            </IonCard>
          )}
        </div>
        <IonToast isOpen={Boolean(toastMessage)} message={toastMessage} duration={2600} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default PromoPage;
