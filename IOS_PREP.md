# DarePool — iOS App Store Preparation Guide

This document explains everything that has been done to prepare DarePool for
iOS packaging with Capacitor, and exactly what remains to be done on a Mac.

---

## What Was Done (Replit side — complete)

### 1. Capacitor Installed & Configured
- **Packages installed**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`
- **`capacitor.config.ts`** created at `artifacts/dare-pool/capacitor.config.ts`
  - App ID: `com.darepool.app` (change to your Apple Developer Team's bundle ID)
  - App Name: `DarePool`
  - Web dir: `dist/public` (matches Vite build output)
  - iOS safe area: `contentInset: "always"`
  - Background color: `#0c0e14` (prevents white flash on launch)
  - Splash screen, status bar, keyboard plugin configs included

### 2. Build Scripts Added (`artifacts/dare-pool/package.json`)
| Script | Command | What it does |
|---|---|---|
| `build:capacitor` | `vite build --config vite.capacitor.config.ts` | Builds the app for Capacitor (no Replit env deps) |
| `cap:sync` | `build:capacitor && npx cap sync ios` | Builds + syncs web assets to iOS project |
| `cap:ios` | `npx cap open ios` | Opens Xcode |
| `cap:run` | `cap:sync && cap:ios` | Full pipeline: build → sync → open Xcode |

### 3. Capacitor-specific Vite Config
- **`artifacts/dare-pool/vite.capacitor.config.ts`** — does NOT require Replit's
  `PORT`/`BASE_PATH` env vars; sets `base: "./"` so assets load from filesystem.
- Output: `artifacts/dare-pool/dist/public/` (same folder Capacitor reads from)

### 4. iOS Mobile Viewport / Safe Areas
- **`index.html`** updated with:
  - `viewport-fit=cover` — extends layout edge-to-edge under notch
  - `apple-mobile-web-app-capable` — enables standalone web app mode
  - `apple-mobile-web-app-status-bar-style: black-translucent` — dark status bar
  - `format-detection: telephone=no` — prevents iOS auto-linking phone numbers
  - `theme-color: #0c0e14` — dark background in browser chrome
- **Bottom nav** (`BottomNav.tsx`) already has `env(safe-area-inset-bottom)` padding

### 5. iOS CSS Compatibility (`src/index.css`)
- `-webkit-text-size-adjust: 100%` — prevents font size changes on rotation
- `-webkit-overflow-scrolling: touch` + `overscroll-behavior-y: none` — smooth iOS scroll
- `-webkit-touch-callout: none` — suppresses long-press callout menus
- `-webkit-tap-highlight-color: transparent` — removes grey tap flash
- `font-size: 16px !important` on all inputs — **prevents iOS auto-zoom on focus**
- `body { background-color: #0c0e14 }` — prevents white overscroll flash
- Utility classes: `.safe-bottom`, `.safe-top`, `.app-content`, `.press-scale`

### 6. Video Compatibility
- Reels page already has `playsInline` on all video elements — required for
  iOS to play video inline (without forcing fullscreen)

### 7. Payment Flow Separation
- `src/lib/iap.ts` — placeholder Apple IAP service module with:
  - Full documentation and integration checklist
  - `IAP_PRODUCT_IDS` map matching all badge/boost products
  - Stub functions: `getProducts()`, `purchaseProduct()`, `restorePurchases()`
  - `isNativeApp()` and `isIOS()` detection utilities
- `Store.tsx` — clear comments separating:
  - **Wallet flow** (Stripe — exempt from Apple IAP, real-money marketplace)
  - **Digital goods flow** (badges/boosts — must migrate to Apple IAP before App Store)
- See the "Apple IAP" section below for migration checklist

### 8. App Icon & Splash Screen Asset Structure
```
artifacts/dare-pool/ios-assets/
  icons/    ← README.md with all required iOS icon sizes
  splash/   ← README.md with splash screen dimensions and setup guide
```

### 9. Legal Pages & App Store Compliance (Pre-existing)
All required legal pages are already routed and accessible:
- `/legal/terms` — Terms of Service
- `/legal/guidelines` — Community Guidelines
- `/legal/privacy` — Privacy Policy
- `/legal/safety` — Safety & Risk Disclaimer
- Signup requires agreement to all 4 before account creation
- Agreement timestamps stored in DB (`termsAcceptedAt`, etc.)
- Moderation/reporting accessible throughout the app

### 10. SPA Routing (Wouter + Capacitor)
Wouter's default history router works with Capacitor because Capacitor serves
`index.html` for all routes via its built-in web server (`app://localhost/`).
No hash-based routing changes needed.

---

## What Remains — Do This on macOS with Xcode

### Step 1: Prerequisites
```bash
# Install Xcode from Mac App Store (free)
# Install Xcode Command Line Tools:
xcode-select --install

# Install Node.js + pnpm if not already installed
npm install -g pnpm

# Join Apple Developer Program ($99/year) at developer.apple.com
# Create an App ID: com.darepool.app in your Apple Developer account
```

### Step 2: Clone & Build

**IMPORTANT**: Before building for Capacitor you MUST set `VITE_API_URL` to your
deployed API server URL, otherwise the app will show "Unable to Load" screens.

```bash
git clone <your-repo>
cd <repo-root>/artifacts/dare-pool

# Install dependencies
pnpm install

# Set your deployed API URL (the Replit deployment URL for the api-server artifact)
export VITE_API_URL=https://your-api-server.replit.app

# Build web app + add iOS platform + sync assets:
pnpm run build:capacitor
npx cap add ios
npx cap sync ios
```

You can also create a `.env.capacitor` file (never commit this):
```
VITE_API_URL=https://your-api-server.replit.app
```

Your API server URL is the deployment URL of the `api-server` artifact.
Deploy it first from Replit, then use that URL here.

The API server already allows cross-origin requests from any origin
(`cors({ origin: true })`), so `capacitor://localhost` and `app://localhost`
are already permitted without any additional CORS configuration.

### Step 3: Open in Xcode
```bash
npx cap open ios
# Or: pnpm run cap:ios
```

### Step 4: Configure in Xcode
In Xcode:
1. **Signing**: Select your Apple Developer Team under Signing & Capabilities
2. **Bundle ID**: Set to `com.darepool.app` (must match App Store Connect)
3. **App Icon**: Drag icon images from `ios-assets/icons/` into the AppIcon asset catalog
4. **Launch Screen**: Edit `LaunchScreen.storyboard` — set background #0c0e14, add logo
5. **Deployment Target**: Set to iOS 15.0 minimum (recommended)
6. **Capabilities**: Add "In-App Purchase" capability (needed for future Apple IAP)

### Step 5: Configure App Backend for Capacitor
When running in Capacitor, API calls need to reach your deployed backend.
Set the API URL in the app:

```typescript
// In src/lib/api.ts, the base URL for production should be your deployed API:
const API_BASE = "https://your-api-domain.replit.app/api";
```

Update `capacitor.config.ts` server section if needed:
```typescript
server: {
  url: "https://your-api-domain.replit.app", // only needed for live reload dev
  cleartext: false,
}
```

For production builds, the app makes API calls to whatever URL is configured
in the fetch calls — make sure your deployed API is live and accessible.

### Step 6: Test on Device
1. Connect iPhone via USB
2. Trust the Mac in Xcode
3. Select your device as the run target
4. Click Run (▶)
5. Test all core flows: signup, dare creation, funding, entry submission, wallet

### Step 7: TestFlight
1. In Xcode: Product → Archive
2. Upload to App Store Connect via Xcode Organizer
3. Set up TestFlight in App Store Connect
4. Invite testers via email or public link

---

## Apple IAP Migration (Before App Store Submission)

Apple requires badges and boosts to be purchased via Apple In-App Purchase,
not via Stripe wallet balance deductions. Here's the migration checklist:

### Backend Changes Needed
- [ ] Add `POST /api/iap/verify` endpoint that validates Apple receipts
- [ ] Call Apple's receipt validation API: `https://buy.itunes.apple.com/verifyReceipt`
- [ ] On valid receipt, grant the badge/boost without wallet deduction
- [ ] Store `appleTransactionId` in the badge/boost record

### Frontend Changes Needed
- [ ] Install a Capacitor IAP plugin:
  ```bash
  pnpm add @capgo/capacitor-purchases
  # or: pnpm add cordova-plugin-purchase
  ```
- [ ] Implement `getProducts()`, `purchaseProduct()`, `restorePurchases()` in `src/lib/iap.ts`
- [ ] In `Store.tsx`, replace `handleBuyBadge` / `handleBoostConfirm` with IAP calls when `isIOS()` returns true
- [ ] Add a "Restore Purchases" button (required by App Store guidelines)

### App Store Connect
- [ ] Create 7 In-App Purchase products:
  - `com.darepool.app.badge.bronze` — $0.99 consumable
  - `com.darepool.app.badge.silver` — $2.99 consumable
  - `com.darepool.app.badge.gold` — $4.99 consumable
  - `com.darepool.app.badge.premium` — $9.99 consumable
  - `com.darepool.app.boost.2hr` — $1.99 consumable
  - `com.darepool.app.boost.10hr` — $4.99 consumable
  - `com.darepool.app.boost.24hr` — $9.99 consumable

---

## Assets You Still Need to Provide

### App Icon
- One **1024×1024px PNG** master icon (no alpha, no rounded corners)
- Upload to https://appicon.co to generate all required sizes
- Place generated files in `ios-assets/icons/`
- Required icon sizes listed in `ios-assets/icons/README.md`

### Splash / Launch Screen
- Design in Xcode's LaunchScreen.storyboard (preferred)
- Background: `#0c0e14`, centered DarePool logo
- Alternatively, provide images per sizes listed in `ios-assets/splash/README.md`

### App Store Listing Assets
- **Screenshots**: Required for each device size:
  - 6.7" iPhone 15 Pro Max (1290×2796px) — minimum 3 screenshots
  - 6.1" iPhone 15 (1179×2556px)
  - 12.9" iPad Pro (2048×2732px) — if supporting iPad
- **App Preview Video**: Optional, up to 30 seconds (highly recommended)
- **App Description**: 4000 character max
- **Keywords**: 100 character max
- **Support URL**: must be a live URL
- **Privacy Policy URL**: must be a live URL (point to /legal/privacy)

---

## Environment Variables for Production

The deployed backend needs these:
```
DATABASE_URL=           # Your PostgreSQL connection string
SESSION_SECRET=         # Already set in Replit secrets
STRIPE_SECRET_KEY=      # Stripe secret key
STRIPE_WEBHOOK_SECRET=  # Stripe webhook signing secret
```

When running in Capacitor (not Replit), the frontend will call the production
API directly. Make sure CORS is configured on the API server to allow the
Capacitor app origin (`capacitor://localhost`, `app://localhost`).

---

## Blockers That Require a Mac/Apple Account

| Blocker | Why |
|---|---|
| `npx cap add ios` | Requires macOS with Xcode installed |
| App icon & splash screen setup | Requires Xcode asset catalog editor |
| Code signing | Requires Apple Developer account + Mac Keychain |
| Building `.ipa` for TestFlight | Requires Xcode Archive on Mac |
| Apple IAP product creation | Requires App Store Connect account |
| TestFlight upload | Requires Xcode Organizer or Transporter app on Mac |

---

## Quick Reference: Key Files Added/Changed

| File | Status | Purpose |
|---|---|---|
| `artifacts/dare-pool/capacitor.config.ts` | NEW | Capacitor app configuration |
| `artifacts/dare-pool/vite.capacitor.config.ts` | NEW | Vite build config for Capacitor |
| `artifacts/dare-pool/src/lib/iap.ts` | NEW | Apple IAP placeholder service |
| `artifacts/dare-pool/ios-assets/icons/README.md` | NEW | Icon size requirements |
| `artifacts/dare-pool/ios-assets/splash/README.md` | NEW | Splash screen guide |
| `artifacts/dare-pool/index.html` | UPDATED | iOS meta tags, safe area |
| `artifacts/dare-pool/package.json` | UPDATED | Capacitor scripts, dependencies |
| `artifacts/dare-pool/src/index.css` | UPDATED | iOS CSS compatibility |
| `artifacts/dare-pool/src/pages/Store.tsx` | UPDATED | IAP separation comments |
