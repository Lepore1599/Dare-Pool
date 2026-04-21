# DarePool App Icons

Place your app icon files in this directory. When you run `npx cap open ios`,
Xcode will be opened and you can drag these into the `AppIcon` asset catalog.

## Required Sizes for iOS App Store

All icons must be PNG format, no alpha/transparency, no rounded corners
(iOS applies the rounded mask automatically).

Background color: #0c0e14 (near-black)
Primary color: #8b5cf6 (electric purple)

| Usage | Size | Filename |
|---|---|---|
| iPhone Notification | 20×20 @2x = 40×40px | icon-40.png |
| iPhone Notification | 20×20 @3x = 60×60px | icon-60.png |
| iPhone Settings | 29×29 @2x = 58×58px | icon-58.png |
| iPhone Settings | 29×29 @3x = 87×87px | icon-87.png |
| iPhone Spotlight | 40×40 @2x = 80×80px | icon-80.png |
| iPhone Spotlight | 40×40 @3x = 120×120px | icon-120.png |
| iPhone App Icon | 60×60 @2x = 120×120px | icon-120.png |
| iPhone App Icon | 60×60 @3x = 180×180px | icon-180.png |
| iPad Notification | 20×20 @1x = 20×20px | icon-20.png |
| iPad Notification | 20×20 @2x = 40×40px | icon-40.png |
| iPad Settings | 29×29 @1x = 29×29px | icon-29.png |
| iPad Settings | 29×29 @2x = 58×58px | icon-58.png |
| iPad Spotlight | 40×40 @1x = 40×40px | icon-40.png |
| iPad Spotlight | 40×40 @2x = 80×80px | icon-80.png |
| iPad App Icon | 76×76 @1x = 76×76px | icon-76.png |
| iPad App Icon | 76×76 @2x = 152×152px | icon-152.png |
| iPad Pro App Icon | 83.5×83.5 @2x = 167×167px | icon-167.png |
| App Store | 1024×1024 @1x | icon-1024.png |

## Quick Generation
Use an icon generator service like:
- https://appicon.co (free, upload 1024×1024 and get all sizes)
- https://makeappicon.com
- Figma + iOS icon export plugin

Upload the 1024×1024 master icon and it will generate all required sizes.
