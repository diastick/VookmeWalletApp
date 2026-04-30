import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { refreshOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { QRCodeSVG } from 'qrcode.react';
import { walletApi } from '../api/walletApi';
import { WalletAppQrResponse } from '../api/walletTypes';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

const getRemainingSeconds = (expiresAtUtc: string): number => {
  const expiresAt = new Date(expiresAtUtc).getTime();
  const remaining = Math.floor((expiresAt - Date.now()) / 1000);
  return Math.max(0, remaining);
};

const QrPage: React.FC = () => {
  const { apiBaseUrl, authFetch } = useWalletAuth();
  const [qr, setQr] = useState<WalletAppQrResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  const loadQr = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch((token) => walletApi.qr(apiBaseUrl, token));
      setQr(response.data ?? null);
      setRemainingSeconds(response.data ? getRemainingSeconds(response.data.expiresAtUtc) : 0);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'QR could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authFetch]);

  useIonViewWillEnter(() => {
    void loadQr();
  });

  useEffect(() => {
    if (!qr) return undefined;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(qr.expiresAtUtc));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [qr]);

  useEffect(() => {
    if (!qr) return undefined;

    const refreshSeconds = Math.max(15, qr.refreshAfterSeconds || 45);
    const timeoutId = window.setTimeout(() => {
      void loadQr();
    }, refreshSeconds * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [loadQr, qr]);

  const qrValue = useMemo(() => qr?.scanUrl || qr?.qrToken || '', [qr]);

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>My QR</IonTitle>
          <IonButton slot="end" fill="clear" onClick={loadQr} aria-label="Refresh QR">
            <IonIcon icon={refreshOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="wallet-page-bg">
        <div className="wallet-content-wrap wallet-qr-wrap">
          <IonCard className="wallet-card wallet-qr-card">
            <IonCardContent>
              <div className="wallet-qr-header">
                <IonIcon icon={shieldCheckmarkOutline} />
                <div>
                  <h2>Secure Wallet QR</h2>
                  <p>Show this QR at participating Vookme stores.</p>
                </div>
              </div>

              <div className="wallet-qr-box">
                {loading && !qrValue && <IonSpinner name="crescent" />}

                {!loading && qrValue && (
                  <QRCodeSVG value={qrValue} size={240} level="M" includeMargin />
                )}

                {!loading && !qrValue && (
                  <IonText color="medium">QR is not available for this wallet yet.</IonText>
                )}
              </div>

              {qr && (
                <div className="wallet-qr-meta">
                  <IonNote>Refreshes automatically</IonNote>
                  <strong>{remainingSeconds}s</strong>
                </div>
              )}

              <IonButton expand="block" fill="outline" onClick={loadQr} disabled={loading}>
                {loading ? <IonSpinner name="crescent" /> : 'Refresh QR'}
              </IonButton>
            </IonCardContent>
          </IonCard>

          <IonNote className="wallet-footnote">
            This QR uses a short-lived server token. It does not expose your phone, email, or wallet ID.
          </IonNote>
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

export default QrPage;
