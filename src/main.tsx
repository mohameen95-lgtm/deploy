import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clean up any legacy service workers or oversized old localStorage keys
try {
  const legacyKeys = [
    'azhar_perfumes_products_v1',
    'azhar_perfumes_products_v2',
    'azhar_perfumes_products_v3',
    'azhar_perfumes_products_v4',
    'azhar_perfumes_products_v5',
    'azhar_perfumes_admin_settings_v1',
    'azhar_perfumes_admin_settings_v2',
  ];
  for (const key of legacyKeys) {
    localStorage.removeItem(key);
  }
} catch {
  // Ignore storage access errors in restricted iframes
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    })
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);

