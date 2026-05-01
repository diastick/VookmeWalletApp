import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonIcon, IonLabel, IonLoading, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { listOutline, personCircleOutline, storefrontOutline, walletOutline } from 'ionicons/icons';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ActivityPage from './pages/ActivityPage';
import StoresPage from './pages/StoresPage';
import ProfilePage from './pages/ProfilePage';
import { WalletAuthProvider, useWalletAuth } from './context/WalletAuthContext';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';

setupIonicReact();

const WalletTabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/wallet/home" component={HomePage} />
      <Route exact path="/wallet/activity" component={ActivityPage} />
      <Route exact path="/wallet/stores" component={StoresPage} />
      <Route exact path="/wallet/profile" component={ProfilePage} />
      <Route exact path="/wallet"><Redirect to="/wallet/home" /></Route>
    </IonRouterOutlet>
    <IonTabBar slot="bottom">
      <IonTabButton tab="home" href="/wallet/home"><IonIcon aria-hidden="true" icon={walletOutline} /><IonLabel>Wallet</IonLabel></IonTabButton>
      <IonTabButton tab="activity" href="/wallet/activity"><IonIcon aria-hidden="true" icon={listOutline} /><IonLabel>Activity</IonLabel></IonTabButton>
      <IonTabButton tab="stores" href="/wallet/stores"><IonIcon aria-hidden="true" icon={storefrontOutline} /><IonLabel>Stores</IonLabel></IonTabButton>
      <IonTabButton tab="profile" href="/wallet/profile"><IonIcon aria-hidden="true" icon={personCircleOutline} /><IonLabel>Profile</IonLabel></IonTabButton>
    </IonTabBar>
  </IonTabs>
);

const AppRoutes: React.FC = () => {
  const { initialized, isAuthenticated } = useWalletAuth();
  if (!initialized) return <IonLoading isOpen message="Opening wallet..." />;
  return (
    <IonRouterOutlet>
      <Route exact path="/login">{isAuthenticated ? <Redirect to="/wallet/home" /> : <LoginPage />}</Route>
      <Route path="/wallet">{isAuthenticated ? <WalletTabs /> : <Redirect to="/login" />}</Route>
      <Route exact path="/"><Redirect to={isAuthenticated ? '/wallet/home' : '/login'} /></Route>
    </IonRouterOutlet>
  );
};

const App: React.FC = () => (
  <IonApp>
    <WalletAuthProvider>
      <IonReactRouter><AppRoutes /></IonReactRouter>
    </WalletAuthProvider>
  </IonApp>
);

export default App;
