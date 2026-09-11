import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lightwick",
  appName: "Lightwick",
  webDir: "../web/dist",
  backgroundColor: "#0a0a0e",
  ios: { contentInset: "never", scrollEnabled: false },
  plugins: {
    // Native HTTP so login and token refresh reach HA without CORS headers on the HA side.
    CapacitorHttp: { enabled: true },
    StatusBar: { style: "DARK", overlaysWebView: true },
  },
};

export default config;
