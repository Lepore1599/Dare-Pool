# DarePool Splash Screens / Launch Screen

Capacitor uses a single launch screen storyboard (LaunchScreen.storyboard)
rather than static image files. You configure this in Xcode.

## Recommended Setup

### Option A: Simple Color + Logo (Recommended)
In Xcode, edit `App/App/Base.lproj/LaunchScreen.storyboard`:
- Set background color to #0c0e14
- Place your DarePool logo (centered, ~200×200pt)
- Xcode scales this automatically for all screen sizes

### Option B: Capacitor Splash Screen Plugin
Install: `pnpm add @capacitor/splash-screen`
Then configure in capacitor.config.ts (already has placeholder config).

Required images if using static splash files:

| Device | Size |
|---|---|
| iPhone 8 / SE | 750×1334px |
| iPhone 14 / 15 | 1179×2556px |
| iPhone 14 Plus / 15 Plus | 1284×2778px |
| iPhone 14 / 15 Pro | 1179×2556px |
| iPhone 14 / 15 Pro Max | 1290×2796px |
| iPad (10th gen) | 1640×2360px |
| iPad Pro 11" | 1668×2388px |
| iPad Pro 12.9" | 2048×2732px |

## Design Guidelines
- Background: #0c0e14 (matches app background — prevents flash)
- Logo: DarePool wordmark or flame icon in white/purple
- Keep it simple — it only shows for ~2 seconds
- No text other than logo (App Store will reject marketing text on splash)

## Colors
- Background: #0c0e14
- Primary purple: #8b5cf6
- White: #f1f5f9
