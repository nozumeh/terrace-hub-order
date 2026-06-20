import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.coralpandas.terrazagourmet',
  appName: 'Terraza Quick Order',
  webDir: 'dist',
  server: {
    url: 'https://terrace-hub-order.lovable.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;