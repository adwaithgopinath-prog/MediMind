import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { registerSW } from 'virtual:pwa-register'

// Auto-update PWA check
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A newer version of MediMind is available. Refresh now?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('MediMind is ready for offline clinical use.')
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
