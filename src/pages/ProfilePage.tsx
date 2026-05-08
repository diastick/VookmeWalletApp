import React, { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { logOutOutline, mailOutline, personOutline, phonePortraitOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { useWalletAuth } from '../context/WalletAuthContext';
import './Wallet.css';

const ProfilePage: React.FC = () => {
  const { customer, apiBaseUrl, logout, updateCustomerProfile } = useWalletAuth();
  const [displayName, setDisplayName] = useState(customer?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    setDisplayName(customer?.displayName || '');
  }, [customer?.displayName]);

  const trimmedName = displayName.trim();
  const currentName = customer?.displayName?.trim() || '';
  const canSave = useMemo(() => trimmedName.length > 0 && trimmedName !== currentName && !saving, [currentName, saving, trimmedName]);

  const saveProfile = async () => {
    if (!trimmedName) {
      setToastMessage('Enter your name.');
      return;
    }

    setSaving(true);
    try {
      await updateCustomerProfile(trimmedName);
      setToastMessage('Profile updated.');
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Profile could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="wallet-page-bg">
        <div className="wallet-content-wrap">
          <div className="wallet-profile-hero">
            <div className="wallet-profile-avatar">{(customer?.displayName || 'V').substring(0, 1).toUpperCase()}</div>
            <h1>{customer?.displayName || 'Vookme Customer'}</h1>
            <p>Your wallet account and sign-in details</p>
          </div>

          <IonCard className="wallet-card wallet-profile-edit-card">
            <IonCardContent>
              <h2>Customer name</h2>
              <p className="wallet-profile-help">This name appears at the top of your wallet.</p>
              <IonItem className="wallet-input-item" lines="full">
                <IonIcon icon={personOutline} slot="start" />
                <IonInput
                  label="Display name"
                  labelPlacement="stacked"
                  value={displayName}
                  maxlength={80}
                  onIonInput={(event) => setDisplayName(String(event.detail.value ?? ''))}
                />
              </IonItem>
              <IonButton expand="block" onClick={saveProfile} disabled={!canSave}>
                {saving && <IonSpinner name="crescent" slot="start" />}
                Save Name
              </IonButton>
            </IonCardContent>
          </IonCard>

          <IonCard className="wallet-card">
            <IonCardContent>
              <IonList className="wallet-clean-list">
                <IonItem lines="full">
                  <IonIcon icon={phonePortraitOutline} slot="start" />
                  <IonLabel><h3>Phone</h3><p>{customer?.phoneMasked || 'Not saved'}</p></IonLabel>
                </IonItem>
                <IonItem lines="full">
                  <IonIcon icon={mailOutline} slot="start" />
                  <IonLabel><h3>Email</h3><p>{customer?.emailMasked || 'Not saved'}</p></IonLabel>
                </IonItem>
                <IonItem lines="none">
                  <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                  <IonLabel><h3>Server</h3><p>{apiBaseUrl}</p></IonLabel>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          <p className="wallet-profile-footnote">Phone and email changes should go through verification.</p>
          <IonButton expand="block" color="danger" onClick={logout}><IonIcon slot="start" icon={logOutOutline} />Sign out</IonButton>
        </div>
        <IonToast isOpen={Boolean(toastMessage)} message={toastMessage} duration={2400} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
