Vookme Wallet iOS setup

This zip adds iOS support to the existing Ionic Capacitor wallet app source.

What changed:
1. package.json now includes @capacitor/ios.
2. src/App.tsx now handles iOS custom scheme and universal link opens.
3. src/pages/TicketScannerPage.tsx has iOS scanner options and neutral native scanner messages.
4. iOS native setup templates are included in this ios-setup folder.

Run on Mac:

npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios

After npx cap add ios, update these native iOS files:

1. ios/App/App/Info.plist
   Add the CFBundleURLTypes and NSCameraUsageDescription entries shown in Info.plist.additions.xml.

2. ios/App/App/App.entitlements
   Add the associated-domains entitlement shown in App.entitlements.example.
   Replace TEAMID only in the apple-app-site-association file, not in Xcode entitlements.

3. Apple Developer account
   Enable Associated Domains for the App ID com.vookme.wallet.

4. Web server
   Host apple-app-site-association at:
   https://vookme.com/.well-known/apple-app-site-association
   https://www.vookme.com/.well-known/apple-app-site-association

Important:
- Custom scheme vookme://ticket/claim/{code} works after Info.plist is configured.
- Universal link https://vookme.com/ticket/claim/{code} requires Apple Associated Domains and the hosted apple-app-site-association file.
- iOS requires a real device for reliable camera testing.
