import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { SettingsProvider } from './store/settings';
import { AuthProvider } from './store/auth';
import { seedIfEmpty } from './db/seed';
import './index.css';

async function bootstrap() {
  try { await seedIfEmpty(); } catch (e) { console.error('seed failed', e); }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AuthProvider>
        <SettingsProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </SettingsProvider>
      </AuthProvider>
    </React.StrictMode>,
  );
}

bootstrap();

// Register service worker (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then((reg) => console.log('SW registered:', reg.scope))
    .catch((err) => console.error('SW registration failed:', err));
}

if (navigator.storage && 'persist' in navigator.storage) {
  navigator.storage.persist().catch(() => undefined);
}
