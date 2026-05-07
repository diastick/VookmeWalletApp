import { Redirect, Route, useHistory } from 'react-router-dom';
import {
  IonApp,
  IonContent,
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonSpinner,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { App as CapacitorApp } from '@capacitor/app';
import { listOutline, personCircleOutline, ribbonOutline, walletOutline } from 'ionicons/icons';
import { useCallback, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ActivityPage from './pages/ActivityPage';
import StoresPage from './pages/StoresPage';
import ProfilePage from './pages/ProfilePage';
import TicketScannerPage from './pages/TicketScannerPage';
import TicketClaimRedirectPage from './pages/TicketClaimRedirectPage';
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
import './pages/Wallet.css';

setupIonicReact();

const WalletTabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/wallet/home" component={HomePage} />
      <Route exact path="/wallet/activity" component={ActivityPage} />
      <Route exact path="/wallet/stores" component={StoresPage} />
      <Route exact path="/wallet/profile" component={ProfilePage} />
      <Route exact path="/wallet/ticket-scan" component={TicketScannerPage} />
      <Route exact path="/wallet"><Redirect to="/wallet/home" /></Route>
    </IonRouterOutlet>
    <IonTabBar slot="bottom">
      <IonTabButton tab="home" href="/wallet/home"><IonIcon aria-hidden="true" icon={walletOutline} /><IonLabel>Wallet</IonLabel></IonTabButton>
      <IonTabButton tab="activity" href="/wallet/activity"><IonIcon aria-hidden="true" icon={listOutline} /><IonLabel>Activity</IonLabel></IonTabButton>
      <IonTabButton tab="stores" href="/wallet/stores"><IonIcon aria-hidden="true" icon={ribbonOutline} /><IonLabel>Network</IonLabel></IonTabButton>
      <IonTabButton tab="profile" href="/wallet/profile"><IonIcon aria-hidden="true" icon={personCircleOutline} /><IonLabel>Profile</IonLabel></IonTabButton>
    </IonTabBar>
  </IonTabs>
);


const getRewardTicketPathFromUrl = (url: string): string | null => {
  const value = (url || '').trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname || '';

    if (parsed.protocol === 'vookme:' && host === 'ticket') {
      const match = path.match(/^\/claim\/([^?#/]+)/i);
      return match?.[1] ? `/ticket/claim/${encodeURIComponent(decodeURIComponent(match[1]))}` : null;
    }

    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && (host === 'vookme.com' || host === 'www.vookme.com' || host === 'api.vookme.com')) {
      const match = path.match(/^\/(?:reward\/ticket\/claim|ticket\/claim)\/([^?#/]+)/i);
      return match?.[1] ? `/ticket/claim/${encodeURIComponent(decodeURIComponent(match[1]))}` : null;
    }
  } catch {
    const match = value.match(/\/(?:reward\/ticket\/claim|ticket\/claim)\/([^?#\s/]+)/i);
    return match?.[1] ? `/ticket/claim/${encodeURIComponent(decodeURIComponent(match[1]))}` : null;
  }

  return null;
};

const OpeningWalletPage: React.FC = () => (
  <IonPage>
    <IonContent fullscreen className="wallet-page-bg">
      <div className="wallet-opening-wrap">
        <IonSpinner name="crescent" />
        <h1>Opening wallet...</h1>
        <p>Loading your secure wallet.</p>
      </div>
    </IonContent>
  </IonPage>
);

const AppRoutes: React.FC = () => {
  const history = useHistory();
  const { initialized, isAuthenticated } = useWalletAuth();

  const openRewardTicketUrl = useCallback((url: string) => {
    const path = getRewardTicketPathFromUrl(url);
    if (path) history.replace(path);
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | null = null;

    CapacitorApp.getLaunchUrl()
      .then((launch) => {
        if (!cancelled && launch?.url) openRewardTicketUrl(launch.url);
      })
      .catch(() => {
        // Ignore launch-url lookup errors. Regular routing still works.
      });

    CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      openRewardTicketUrl(url);
    })
      .then((listener) => {
        if (cancelled) listener.remove();
        else removeListener = () => listener.remove();
      })
      .catch(() => {
        // Browser/PWA builds may not provide native URL events.
      });

    return () => {
      cancelled = true;
      if (removeListener) removeListener();
    };
  }, [openRewardTicketUrl]);

  if (!initialized) return <OpeningWalletPage />;

  return (
    <IonRouterOutlet>
      <Route exact path="/ticket/claim/:code" component={TicketClaimRedirectPage} />
      <Route exact path="/login">{isAuthenticated ? <Redirect to="/wallet/home" /> : <LoginPage />}</Route>
      <Route path="/wallet">{isAuthenticated ? <WalletTabs /> : <Redirect to="/login" />}</Route>
      <Route exact path="/"><Redirect to={isAuthenticated ? '/wallet/home' : '/login'} /></Route>
      <Route><Redirect to={isAuthenticated ? '/wallet/home' : '/login'} /></Route>
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
