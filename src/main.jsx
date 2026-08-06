import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import { getTheme } from './lib/storage'

// Last-resort safety net: shows a readable error instead of a blank screen
// for anything React's own error boundary can't catch (errors thrown in
// event handlers, unhandled promise rejections, or a crash before React
// even finishes mounting).
function showFatalError(message) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#121314;color:#EDEAE3;font-family:sans-serif;text-align:center;">
      <div style="max-width:420px;width:100%;">
        <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.6;margin-bottom:8px;">Something broke</p>
        <h1 style="font-size:20px;font-weight:800;margin-bottom:16px;">one64garage hit an error</h1>
        <pre style="text-align:left;font-size:11px;background:#1B1D1F;border:1px solid #33353A;padding:12px;white-space:pre-wrap;word-break:break-word;margin-bottom:16px;">${String(message).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</pre>
        <button onclick="window.location.href='${import.meta.env.BASE_URL}'" style="background:#EDEAE3;color:#121314;padding:10px 20px;border:none;font-size:13px;">Reload to Garage</button>
      </div>
    </div>`;
}

window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.error || e.message);
  showFatalError(e.error?.stack || e.message || 'Unknown error');
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
  showFatalError(e.reason?.stack || e.reason?.message || String(e.reason) || 'Unknown error');
});

// Apply saved theme (or system preference) before first paint to avoid a flash.
const saved = getTheme();
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (saved === 'dark' || (!saved && prefersDark)) {
  document.documentElement.classList.add('dark');
}

// Offline-first: registers the service worker built by vite-plugin-pwa.
// New versions install silently in the background; rather than swapping
// code out from under an open session, this shows a small prompt so the
// person can reload on their own terms once one's ready.
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      const toast = document.createElement('div');
      toast.style.cssText =
        'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#EDEAE3;color:#121314;' +
        'padding:10px 16px;font-family:sans-serif;font-size:13px;border-radius:4px;z-index:9999;' +
        'box-shadow:0 2px 12px rgba(0,0,0,0.35);cursor:pointer;text-align:center;';
      toast.textContent = 'An update is ready — tap to reload';
      toast.onclick = () => window.location.reload();
      document.body.appendChild(toast);
    },
    onOfflineReady() {
      console.log('one64garage is cached and ready to work offline.');
    },
  });
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  )
} catch (err) {
  showFatalError(err?.stack || err?.message || String(err));
}
