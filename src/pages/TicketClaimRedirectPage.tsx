import React, { useEffect, useMemo, useState } from 'react';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { addCircleOutline, checkmarkCircleOutline, walletOutline, warningOutline } from 'ionicons/icons';
import { walletApi, WalletApiError, extractRewardTicketCode } from '../api/walletApi';
import { WalletAppRewardTicketDetailDto } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

interface RouteParams {
  code: string;
}

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

const formatDate = (value?: string | null): string => {
  if (!value) return 'No expiration date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Expiration date unavailable';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const TicketClaimRedirectPage: React.FC<RouteComponentProps<RouteParams>> = ({ match }) => {
  const history = useHistory();
  const { apiBaseUrl, accessToken, isAuthenticated, authFetch } = useWalletAuth();
  const code = useMemo(() => extractRewardTicketCode(match.params.code), [match.params.code]);
  const [ticket, setTicket] = useState<WalletAppRewardTicketDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage('');
      setTicket(null);
      try {
        const response = await walletApi.rewardTicketDetail(apiBaseUrl, code, accessToken || null);
        if (mounted) setTicket(response.data ?? null);
      } catch (error) {
        const message = error instanceof WalletApiError ? error.apiMessage || error.message : error instanceof Error ? error.message : 'Reward ticket could not be loaded.';
        if (mounted) setErrorMessage(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (code) void load();
    else {
      setErrorMessage('Reward ticket code is missing.');
      setLoading(false);
    }

    return () => { mounted = false; };
  }, [apiBaseUrl, accessToken, code]);

  const handleAddToWallet = async () => {
    if (!ticket || adding) return;

    if (!isAuthenticated) {
      const redirect = `/ticket/claim/${encodeURIComponent(code)}`;
      history.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    setAdding(true);
    try {
      const result = await authFetch((token) => walletApi.claimRewardTicket(apiBaseUrl, code, token));
      if (result.data?.ticket) setTicket(result.data.ticket);
      setToastMessage(result.message || 'Reward ticket added to your wallet.');
    } catch (error) {
      const message = error instanceof WalletApiError ? error.apiMessage || error.message : error instanceof Error ? error.message : 'Unable to add this reward ticket.';
      setToastMessage(message);
    } finally {
      setAdding(false);
    }
  };

  const canAdd = Boolean(ticket?.canAddToWallet);
  const alreadyAdded = Boolean(ticket?.alreadyAddedToWallet);
  const unavailable = Boolean(ticket && !ticket.canAddToWallet && !ticket.alreadyAddedToWallet);

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Reward Ticket</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="wallet-page-bg">
        <div className="wallet-content-wrap wallet-ticket-detail-wrap">
          <IonCard className="wallet-card wallet-ticket-detail-card">
            <IonCardContent>
              {loading && (
                <div className="wallet-opening-wrap wallet-ticket-loading">
                  <IonSpinner name="crescent" />
                  <h1>Opening reward ticket...</h1>
                  <p>Checking this ticket status.</p>
                </div>
              )}

              {!loading && errorMessage && (
                <div className="wallet-ticket-detail-state wallet-ticket-detail-error">
                  <IonIcon icon={warningOutline} />
                  <h1>Ticket unavailable</h1>
                  <p>{errorMessage}</p>
                  <IonButton expand="block" routerLink="/wallet/home">Back to Wallet</IonButton>
                </div>
              )}

              {!loading && ticket && (
                <>
                  <div className={`wallet-ticket-detail-status ${alreadyAdded ? 'is-added' : unavailable ? 'is-unavailable' : 'is-available'}`}>
                    <IonIcon icon={alreadyAdded ? checkmarkCircleOutline : unavailable ? warningOutline : addCircleOutline} />
                    <span>{ticket.statusText || ticket.status}</span>
                  </div>

                  <div className="wallet-ticket-detail-hero">
                    <div className="wallet-ticket-detail-store">{ticket.storeName}</div>
                    <h1>{ticket.rewardName || 'Reward Ticket'}</h1>
                    <div className="wallet-ticket-detail-points">{ticket.points.toLocaleString()} pts</div>
                    <div className="wallet-ticket-detail-value">≈ {formatMoney(ticket.rewardValue)} reward value</div>
                  </div>

                  <div className="wallet-ticket-detail-meta">
                    <div>
                      <span>Expires</span>
                      <strong>{formatDate(ticket.expiresAtUtc)}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{ticket.statusText || ticket.status}</strong>
                    </div>
                  </div>

                  {ticket.thankYouMessage && (
                    <IonText color="medium">
                      <p className="wallet-ticket-detail-thanks">{ticket.thankYouMessage}</p>
                    </IonText>
                  )}

                  {canAdd && (
                    <IonButton expand="block" size="large" onClick={handleAddToWallet} disabled={adding}>
                      {adding ? <IonSpinner name="crescent" /> : <IonIcon icon={walletOutline} slot="start" />}
                      {isAuthenticated ? 'Add to My Wallet' : 'Sign in to Add to Wallet'}
                    </IonButton>
                  )}

                  {alreadyAdded && (
                    <IonButton expand="block" size="large" routerLink="/wallet/home">
                      <IonIcon icon={walletOutline} slot="start" />
                      View My Wallet
                    </IonButton>
                  )}

                  {unavailable && (
                    <IonButton expand="block" routerLink="/wallet/home">Back to Wallet</IonButton>
                  )}
                </>
              )}
            </IonCardContent>
          </IonCard>
        </div>
        <IonToast isOpen={Boolean(toastMessage)} message={toastMessage} duration={2800} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default TicketClaimRedirectPage;
