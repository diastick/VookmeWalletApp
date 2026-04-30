import React, { useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

const LoginPage: React.FC = () => {
  const history = useHistory();
  const { apiBaseUrl, setApiBaseUrl, requestCode, verifyCode } = useWalletAuth();
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [method, setMethod] = useState<'email' | 'sms' | ''>('email');
  const [verificationToken, setVerificationToken] = useState('');
  const [destinationMasked, setDestinationMasked] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [editableApiUrl, setEditableApiUrl] = useState(apiBaseUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleRequestCode = async () => {
    if (!phoneOrEmail.trim()) {
      setToastMessage('Enter your phone number or email.');
      return;
    }

    setBusy(true);
    try {
      await setApiBaseUrl(editableApiUrl);
      const result = await requestCode(phoneOrEmail.trim(), method);
      setVerificationToken(result.verificationToken);
      setDestinationMasked(result.destinationMasked);
      setToastMessage(`Verification code sent to ${result.destinationMasked}.`);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Verification code request failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationToken) {
      setToastMessage('Request a verification code first.');
      return;
    }

    if (!otpCode.trim()) {
      setToastMessage('Enter the verification code.');
      return;
    }

    setBusy(true);
    try {
      await verifyCode(verificationToken, otpCode.trim());
      history.replace('/wallet/home');
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Vookme Wallet</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="wallet-login-bg">
        <div className="wallet-login-wrap">
          <div className="wallet-brand-block">
            <div className="wallet-logo-mark">V</div>
            <h1>Vookme Wallet</h1>
            <p>Open your QR, rewards, gift cards, and connected stores in one place.</p>
          </div>

          <IonCard className="wallet-card wallet-login-card">
            <IonCardContent>
              <IonText color="dark">
                <h2>{verificationToken ? 'Enter verification code' : 'Sign in'}</h2>
              </IonText>

              {!verificationToken && (
                <>
                  <IonItem lines="full" className="wallet-input-item">
                    <IonLabel position="stacked">Phone or email</IonLabel>
                    <IonInput
                      value={phoneOrEmail}
                      inputMode="email"
                      autocomplete="email"
                      placeholder="you@example.com or phone"
                      onIonInput={(event) => setPhoneOrEmail(String(event.detail.value ?? ''))}
                    />
                  </IonItem>

                  <IonSegment
                    value={method}
                    onIonChange={(event) => setMethod((event.detail.value as 'email' | 'sms' | '') ?? 'email')}
                    className="wallet-segment"
                  >
                    <IonSegmentButton value="email">Email</IonSegmentButton>
                    <IonSegmentButton value="sms">SMS</IonSegmentButton>
                  </IonSegment>

                  <IonButton expand="block" size="large" onClick={handleRequestCode} disabled={busy}>
                    {busy ? <IonSpinner name="crescent" /> : 'Send code'}
                  </IonButton>
                </>
              )}

              {verificationToken && (
                <>
                  <IonNote className="wallet-note-block">
                    Code sent to <strong>{destinationMasked}</strong>
                  </IonNote>

                  <IonItem lines="full" className="wallet-input-item">
                    <IonLabel position="stacked">Verification code</IonLabel>
                    <IonInput
                      value={otpCode}
                      inputMode="numeric"
                      maxlength={10}
                      placeholder="6-digit code"
                      onIonInput={(event) => setOtpCode(String(event.detail.value ?? ''))}
                    />
                  </IonItem>

                  <IonButton expand="block" size="large" onClick={handleVerifyCode} disabled={busy}>
                    {busy ? <IonSpinner name="crescent" /> : 'Verify and open wallet'}
                  </IonButton>

                  <IonButton
                    expand="block"
                    fill="clear"
                    onClick={() => {
                      setVerificationToken('');
                      setOtpCode('');
                    }}
                  >
                    Use a different phone or email
                  </IonButton>
                </>
              )}

              <IonButton expand="block" fill="clear" size="small" onClick={() => setShowAdvanced((value) => !value)}>
                API settings
              </IonButton>

              {showAdvanced && (
                <IonItem lines="full" className="wallet-input-item">
                  <IonLabel position="stacked">API base URL</IonLabel>
                  <IonInput
                    value={editableApiUrl}
                    placeholder="https://api.vookme.com"
                    onIonInput={(event) => setEditableApiUrl(String(event.detail.value ?? ''))}
                  />
                </IonItem>
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

export default LoginPage;
