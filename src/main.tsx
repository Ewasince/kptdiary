import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './ui/App';
import { setNeedRefresh } from './ui/swState';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// onNeedRefresh fires asynchronously, after updateSW is assigned.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    setNeedRefresh(() => updateSW(true));
  },
});

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
