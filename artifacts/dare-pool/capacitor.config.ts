import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.darepool.app",
  appName: "DarePool",
  webDir: "dist/public",

  server: {
    iosScheme: "app",
    androidScheme: "https",
    allowNavigation: [],
  },

  ios: {
    contentInset: "always",
    scrollEnabled: false,
    backgroundColor: "#0c0e14",
    preferredContentMode: "mobile",
    limitsNavigationsToAppBoundDomains: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0c0e14",
      iosSpinnerStyle: "large",
      spinnerColor: "#8b5cf6",
      showSpinner: false,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0c0e14",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
