import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { arrowBackOutline, cameraOutline, openOutline, ticketOutline, warningOutline } from 'ionicons/icons';
import { buildRewardTicketAppPath, extractRewardTicketCode } from '../api/walletApi';
import './Wallet.css';

type ScanStatus = 'idle' | 'scanning' | 'invalid' | 'success' | 'error';

const extractTicketValue = (raw: string): string => {
  const value = (raw || '').trim();
  if (!value) return '';

  const code = extractRewardTicketCode(value);
  if (!code || code === value) {
    return /^rt\.\d+\.\d+\.[A-Za-z0-9_-]+$/i.test(value) ? value : '';
  }

  return code;
};

const getScanErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();

  if (lower.includes('permission') || lower.includes('denied') || lower.includes('not authorized')) {
    return 'Camera permission was denied. Allow Camera permission in the app settings and try again.';
  }

  if (lower.includes('cancel')) {
    return 'Scan cancelled.';
  }

  if (lower.includes('not implemented') || lower.includes('notimplemented')) {
    return 'Native scanner is not available in this build. Install the Capacitor barcode scanner plugin and sync the native project.';
  }

  return 'Unable to start the native scanner. Try again or paste the ticket code.';
};

const TicketScannerPage: React.FC = () => {
  const history = useHistory();
  const [manualCode, setManualCode] = useState('');
  const [lastUrl, setLastUrl] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanMessage, setScanMessage] = useState('Point the camera at a Vookme reward ticket QR.');

  const goToClaim = (ticketValue: string) => {
    const url = buildRewardTicketAppPath(ticketValue);
    setLastUrl(url);
    setScanStatus('success');
    setScanMessage('Vookme reward ticket found. Opening ticket detail...');
    window.setTimeout(() => { history.push(url); }, 180);
  };

  const handleOpenManual = () => {
    const value = extractTicketValue(manualCode);
    if (!value) {
      setScanStatus('invalid');
      setScanMessage('This is not a Vookme reward ticket code or claim URL.');
      setToastMessage('Enter or paste a Vookme reward ticket code first.');
      return;
    }

    goToClaim(value);
  };

  const handleNativeScan = async () => {
    if (busy) return;

    setBusy(true);
    setScanStatus('scanning');
    setScanMessage('Native camera scanner is opening...');

    try {
      const scanner = await import('@capacitor/barcode-scanner');
      const result = await scanner.CapacitorBarcodeScanner.scanBarcode({
        hint: scanner.CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: 'Scan a Vookme reward ticket QR',
        scanButton: false,
        scanText: 'Scan',
        cameraDirection: 1,
        scanOrientation: 1,
        android: {
          scanningLibrary: 'zxing',
        },
        ios: {
          scanningLibrary: 'avFoundation',
        },
        web: {
          showCameraSelection: true,
          scannerFPS: 10,
        },
      } as any);

      const rawValue = String(result?.ScanResult || '').trim();
      const value = extractTicketValue(rawValue);

      if (!rawValue) {
        setScanStatus('error');
        setScanMessage('No QR code was read. Try again.');
        setToastMessage('No QR code was read. Try again.');
        return;
      }

      if (!value) {
        setScanStatus('invalid');
        setScanMessage('QR was read, but it is not a Vookme reward ticket.');
        setToastMessage('This QR is not a Vookme reward ticket.');
        return;
      }

      goToClaim(value);
    } catch (error) {
      const message = getScanErrorMessage(error);
      setScanStatus(message === 'Scan cancelled.' ? 'idle' : 'error');
      setScanMessage(message === 'Scan cancelled.' ? 'Point the camera at a Vookme reward ticket QR.' : message);
      if (message !== 'Scan cancelled.') setToastMessage(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButton slot="start" fill="clear" routerLink="/wallet/home" aria-label="Back to wallet">
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
          <IonTitle>Claim Reward Ticket</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="wallet-page-bg">
        <div className="wallet-content-wrap wallet-ticket-scan-wrap">
          <IonCard className="wallet-card wallet-ticket-scan-card">
            <IonCardContent>
              <div className="wallet-ticket-scan-hero">
                <span className="wallet-ticket-scan-icon"><IonIcon icon={ticketOutline} /></span>
                <h1>Scan a reward ticket</h1>
                <p>Open the camera scanner. If the QR is valid, the ticket detail will open inside the wallet app.</p>
              </div>

              <div className={`wallet-native-scan-status wallet-native-scan-${scanStatus}`}>
                <div className="wallet-native-scan-frame">
                  <span className="wallet-native-scan-corner wallet-native-scan-corner-tl" />
                  <span className="wallet-native-scan-corner wallet-native-scan-corner-tr" />
                  <span className="wallet-native-scan-corner wallet-native-scan-corner-bl" />
                  <span className="wallet-native-scan-corner wallet-native-scan-corner-br" />
                  {scanStatus === 'invalid' || scanStatus === 'error' ? <IonIcon icon={warningOutline} /> : <IonIcon icon={cameraOutline} />}
                </div>
                <p>{scanMessage}</p>
              </div>

              <IonButton expand="block" size="large" disabled={busy} onClick={handleNativeScan}>
                <IonIcon icon={cameraOutline} slot="start" />
                {busy ? 'Scanning...' : 'Scan with Camera'}
              </IonButton>

              <div className="wallet-ticket-divider"><span>or</span></div>

              <IonItem className="wallet-input-item">
                <IonInput
                  label="Ticket code or URL"
                  labelPlacement="stacked"
                  value={manualCode}
                  placeholder="Paste ticket code"
                  onIonInput={(event) => setManualCode(String(event.detail.value || ''))}
                />
              </IonItem>
              <IonButton expand="block" fill="outline" onClick={handleOpenManual}>
                <IonIcon icon={openOutline} slot="start" />
                Open Ticket Detail
              </IonButton>

              {lastUrl && (
                <IonText color="medium">
                  <p className="wallet-ticket-last-url">Last ticket path: {lastUrl}</p>
                </IonText>
              )}
            </IonCardContent>
          </IonCard>
        </div>
        <IonToast isOpen={Boolean(toastMessage)} message={toastMessage} duration={3000} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default TicketScannerPage;
