import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonLoading,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  giftOutline,
  homeOutline,
  qrCodeOutline,
  ribbonOutline,
  storefrontOutline,
} from 'ionicons/icons';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import QrPage from './pages/QrPage';
import RewardsPage from './pages/RewardsPage';
import GiftCardsPage from './pages/GiftCardsPage';
import StoresPage from './pages/StoresPage';
import { WalletAuthProvider, useWalletAuth } from './context/WalletAuthContext';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const WalletTabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/wallet/home" component={HomePage} />
      <Route exact path="/wallet/qr" component={QrPage} />
      <Route exact path="/wallet/rewards" component={RewardsPage} />
      <Route exact path="/wallet/giftcards" component={GiftCardsPage} />
      <Route exact path="/wallet/stores" component={StoresPage} />
      <Route exact path="/wallet">
        <Redirect to="/wallet/home" />
      </Route>
    </IonRouterOutlet>

    <IonTabBar slot="bottom">
      <IonTabButton tab="home" href="/wallet/home">
        <IonIcon aria-hidden="true" icon={homeOutline} />
        <IonLabel>Home</IonLabel>
      </IonTabButton>
      <IonTabButton tab="qr" href="/wallet/qr">
        <IonIcon aria-hidden="true" icon={qrCodeOutline} />
        <IonLabel>QR</IonLabel>
      </IonTabButton>
      <IonTabButton tab="rewards" href="/wallet/rewards">
        <IonIcon aria-hidden="true" icon={ribbonOutline} />
        <IonLabel>Rewards</IonLabel>
      </IonTabButton>
      <IonTabButton tab="giftcards" href="/wallet/giftcards">
        <IonIcon aria-hidden="true" icon={giftOutline} />
        <IonLabel>Cards</IonLabel>
      </IonTabButton>
      <IonTabButton tab="stores" href="/wallet/stores">
        <IonIcon aria-hidden="true" icon={storefrontOutline} />
        <IonLabel>Stores</IonLabel>
      </IonTabButton>
    </IonTabBar>
  </IonTabs>
);

const AppRoutes: React.FC = () => {
  const { initialized, isAuthenticated } = useWalletAuth();

  if (!initialized) {
    return <IonLoading isOpen message="Opening wallet..." />;
  }

  return (
    <IonRouterOutlet>
      <Route exact path="/login">
        {isAuthenticated ? <Redirect to="/wallet/home" /> : <LoginPage />}
      </Route>

      <Route path="/wallet">
        {isAuthenticated ? <WalletTabs /> : <Redirect to="/login" />}
      </Route>

      <Route exact path="/">
        <Redirect to={isAuthenticated ? '/wallet/home' : '/login'} />
      </Route>
    </IonRouterOutlet>
  );
};

const App: React.FC = () => (
  <IonApp>
    <WalletAuthProvider>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </WalletAuthProvider>
  </IonApp>
);

export default App;
