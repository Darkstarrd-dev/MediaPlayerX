import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './features/theme/themeRegistry'
import App from './App.tsx'
import BenchRoot from './bench/BenchRoot.tsx'
import { I18nProvider } from './i18n/I18nProvider.tsx'

const benchMode = new URLSearchParams(window.location.search).get('bench')

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    {benchMode ? (
      <BenchRoot benchMode={benchMode} />
    ) : (
      <StrictMode>
        <App />
      </StrictMode>
    )}
  </I18nProvider>,
)
