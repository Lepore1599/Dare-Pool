/**
 * ─── Apple In-App Purchase (IAP) Service ─────────────────────────────────────
 *
 * PLACEHOLDER — not yet implemented.
 *
 * This module is the intended home for all Apple IAP logic once the app
 * is submitted to the App Store. Apple requires that digital goods sold
 * inside an iOS app use Apple IAP — NOT direct payment processors like Stripe.
 *
 * ─── What goes here when you implement it: ───────────────────────────────────
 *   1. Import and initialize a Capacitor IAP plugin, e.g.:
 *        @capgo/capacitor-purchases (RevenueCat-compatible)
 *        cordova-plugin-purchase (wraps StoreKit)
 *
 *   2. Define product IDs that match your App Store Connect configuration:
 *        BADGE_BRONZE    = "com.darepool.app.badge.bronze"
 *        BADGE_SILVER    = "com.darepool.app.badge.silver"
 *        BADGE_GOLD      = "com.darepool.app.badge.gold"
 *        BADGE_PREMIUM   = "com.darepool.app.badge.premium"
 *        BOOST_TIER1     = "com.darepool.app.boost.2hr"
 *        BOOST_TIER2     = "com.darepool.app.boost.10hr"
 *        BOOST_TIER3     = "com.darepool.app.boost.24hr"
 *
 *   3. Implement purchaseProduct(productId) using StoreKit transactions.
 *
 *   4. On successful purchase receipt, call the DarePool backend to grant
 *      the item (badge/boost) — verified server-side via Apple's receipt API.
 *
 * ─── App Store Compliance Note: ──────────────────────────────────────────────
 *   - Badges and boosts are DIGITAL GOODS → must use Apple IAP on iOS.
 *   - Dare funding, payouts, and withdrawals are REAL-MONEY TRANSFERS
 *     → these are handled by Stripe and are exempt from Apple IAP rules
 *     (Apple does not take a cut of real-money marketplace transactions).
 *   - Keep these two flows strictly separate. Do NOT mix wallet balance
 *     deductions with StoreKit purchases in the same code path.
 *
 * ─── Integration checklist (do this on macOS + Xcode): ──────────────────────
 *   [ ] Create App Store Connect app record (com.darepool.app)
 *   [ ] Configure In-App Purchase products in App Store Connect
 *   [ ] Add Capability: In-App Purchase in Xcode project settings
 *   [ ] Install IAP plugin: pnpm add @capgo/capacitor-purchases
 *   [ ] Replace stub functions below with real StoreKit calls
 *   [ ] Test with StoreKit sandbox accounts on device
 */

export interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
}

export interface IAPPurchaseResult {
  success: boolean;
  productId: string;
  transactionId?: string;
  receipt?: string;
  error?: string;
}

/** Returns true when running inside a Capacitor native wrapper. */
export function isNativeApp(): boolean {
  return typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform === "function"
    && ((window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform());
}

/** Returns true when running on iOS (Capacitor native). */
export function isIOS(): boolean {
  return isNativeApp() && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Stub: fetch available IAP products from the App Store.
 * Replace with real StoreKit product fetch when IAP plugin is installed.
 */
export async function getProducts(_productIds: string[]): Promise<IAPProduct[]> {
  console.warn("[IAP] getProducts called but IAP plugin is not yet installed.");
  return [];
}

/**
 * Stub: initiate a purchase flow for a given product ID.
 * Replace with real StoreKit purchase when IAP plugin is installed.
 *
 * On success, call your backend at POST /api/iap/verify with the receipt
 * to grant the item server-side (required by Apple guidelines).
 */
export async function purchaseProduct(productId: string): Promise<IAPPurchaseResult> {
  console.warn(`[IAP] purchaseProduct("${productId}") called but IAP plugin is not yet installed.`);
  return {
    success: false,
    productId,
    error: "IAP not yet configured. Please complete Xcode setup.",
  };
}

/**
 * Stub: restore previously purchased non-consumable products.
 * Required by App Store guidelines — your app must have a "Restore Purchases" button.
 */
export async function restorePurchases(): Promise<void> {
  console.warn("[IAP] restorePurchases called but IAP plugin is not yet installed.");
}

/**
 * Product ID map — update these to match your App Store Connect configuration.
 * These IDs must match exactly what you create in App Store Connect.
 */
export const IAP_PRODUCT_IDS = {
  BADGE_BRONZE:  "com.darepool.app.badge.bronze",
  BADGE_SILVER:  "com.darepool.app.badge.silver",
  BADGE_GOLD:    "com.darepool.app.badge.gold",
  BADGE_PREMIUM: "com.darepool.app.badge.premium",
  BOOST_2HR:     "com.darepool.app.boost.2hr",
  BOOST_10HR:    "com.darepool.app.boost.10hr",
  BOOST_24HR:    "com.darepool.app.boost.24hr",
} as const;

export type IAPProductId = (typeof IAP_PRODUCT_IDS)[keyof typeof IAP_PRODUCT_IDS];
