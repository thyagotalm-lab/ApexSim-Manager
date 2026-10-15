import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nova versão do ApexSim Manager disponível.');
  },
  onOfflineReady() {
    console.log('ApexSim Manager pronto para funcionamento offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

